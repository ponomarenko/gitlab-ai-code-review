#!/usr/bin/env node

/**
 * Knowledge Base Setup Script
 * Uploads markdown files from knowledge-base/ to Dify
 */

const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
require('dotenv').config();

const DIFY_API_KEY = process.env.DIFY_API_KEY;
const DIFY_API_URL = process.env.DIFY_API_URL || 'https://api.dify.ai/v1';
const KNOWLEDGE_BASE_DIR = path.join(__dirname, '../knowledge-base');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Create Dify API client
 */
function createDifyClient() {
  return axios.create({
    baseURL: DIFY_API_URL,
    headers: {
      'Authorization': `Bearer ${DIFY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  });
}

/**
 * Get all markdown files from directory recursively
 */
async function getAllMarkdownFiles(dir, fileList = []) {
  const files = await fs.readdir(dir, { withFileTypes: true });

  for (const file of files) {
    const filePath = path.join(dir, file.name);
    
    if (file.isDirectory()) {
      await getAllMarkdownFiles(filePath, fileList);
    } else if (file.name.endsWith('.md')) {
      fileList.push(filePath);
    }
  }

  return fileList;
}

/**
 * Read file content and metadata
 */
async function readMarkdownFile(filePath) {
  const content = await fs.readFile(filePath, 'utf-8');
  const relativePath = path.relative(KNOWLEDGE_BASE_DIR, filePath);
  const category = path.dirname(relativePath);
  const fileName = path.basename(filePath, '.md');

  return {
    path: relativePath,
    category,
    fileName,
    content,
    metadata: {
      source: relativePath,
      type: 'best-practices',
      category,
    },
  };
}

/**
 * Create or get knowledge base (dataset) in Dify
 */
async function getOrCreateDataset(client, name) {
  try {
    log(`\nChecking for existing dataset: ${name}...`, 'blue');
    
    // List datasets
    const { data: datasets } = await client.get('/datasets', {
      params: { page: 1, limit: 100 }
    });

    // Find existing dataset
    const existing = datasets.data?.find(ds => ds.name === name);
    
    if (existing) {
      log(`✓ Found existing dataset: ${existing.id}`, 'green');
      return existing;
    }

    // Create new dataset
    log(`Creating new dataset: ${name}...`, 'yellow');
    const { data: newDataset } = await client.post('/datasets', {
      name,
      description: 'Best practices and guidelines for code review',
      indexing_technique: 'high_quality', // or 'economy'
      permission: 'only_me',
    });

    log(`✓ Created dataset: ${newDataset.id}`, 'green');
    return newDataset;

  } catch (error) {
    log(`✗ Error managing dataset: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * Upload document to Dify dataset
 */
async function uploadDocument(client, datasetId, doc) {
  try {
    log(`  Uploading: ${doc.path}...`, 'blue');

    const { data } = await client.post(`/datasets/${datasetId}/document/create_by_text`, {
      name: doc.fileName,
      text: doc.content,
      indexing_technique: 'high_quality',
      process_rule: {
        mode: 'automatic',
        rules: {
          pre_processing_rules: [
            { id: 'remove_extra_spaces', enabled: true },
            { id: 'remove_urls_emails', enabled: false }
          ],
          segmentation: {
            separator: '\n',
            max_tokens: 800
          }
        }
      },
      doc_form: 'text_model',
      doc_language: 'English',
      retrieval_model: {
        search_method: 'semantic_search',
        reranking_enable: true,
        reranking_model: {
          reranking_provider_name: 'cohere',
          reranking_model_name: 'rerank-english-v2.0'
        },
        top_k: 3,
        score_threshold_enabled: true,
        score_threshold: 0.5
      }
    });

    log(`  ✓ Uploaded: ${doc.fileName} (ID: ${data.document.id})`, 'green');
    return data.document;

  } catch (error) {
    log(`  ✗ Failed to upload ${doc.path}: ${error.message}`, 'red');
    if (error.response?.data) {
      log(`    Details: ${JSON.stringify(error.response.data)}`, 'red');
    }
    return null;
  }
}

/**
 * Wait for document indexing to complete
 */
async function waitForIndexing(client, datasetId, documentId, maxWaitTime = 60000) {
  const startTime = Date.now();
  const pollInterval = 2000; // 2 seconds

  log(`  Waiting for indexing...`, 'yellow');

  while (Date.now() - startTime < maxWaitTime) {
    try {
      const { data } = await client.get(`/datasets/${datasetId}/documents/${documentId}`);
      
      if (data.indexing_status === 'completed') {
        log(`  ✓ Indexing completed`, 'green');
        return true;
      } else if (data.indexing_status === 'error') {
        log(`  ✗ Indexing failed`, 'red');
        return false;
      }

      // Still processing
      await new Promise(resolve => setTimeout(resolve, pollInterval));

    } catch (error) {
      log(`  ✗ Error checking status: ${error.message}`, 'red');
      return false;
    }
  }

  log(`  ⚠ Indexing timeout`, 'yellow');
  return false;
}

/**
 * Main setup function
 */
async function setupKnowledgeBase() {
  log('='.repeat(60), 'blue');
  log('  Knowledge Base Setup for Dify RAG', 'blue');
  log('='.repeat(60), 'blue');

  // Validate environment
  if (!DIFY_API_KEY) {
    log('\n✗ Error: DIFY_API_KEY not found in environment', 'red');
    log('  Please set DIFY_API_KEY in your .env file', 'yellow');
    process.exit(1);
  }

  try {
    // Create Dify client
    const client = createDifyClient();

    // Get all markdown files
    log('\nScanning knowledge base directory...', 'blue');
    const markdownFiles = await getAllMarkdownFiles(KNOWLEDGE_BASE_DIR);
    log(`✓ Found ${markdownFiles.length} markdown files`, 'green');

    // Read all documents
    log('\nReading documents...', 'blue');
    const documents = await Promise.all(
      markdownFiles.map(file => readMarkdownFile(file))
    );
    log(`✓ Read ${documents.length} documents`, 'green');

    // Group by category
    const categories = [...new Set(documents.map(d => d.category))];
    log(`\nCategories found: ${categories.join(', ')}`, 'blue');

    // Create or get dataset
    const datasetName = process.env.RAG_KNOWLEDGE_BASE || 'frontend-best-practices';
    const dataset = await getOrCreateDataset(client, datasetName);

    // Upload documents
    log('\nUploading documents to Dify...', 'blue');
    let successCount = 0;
    let failCount = 0;

    for (const doc of documents) {
      const result = await uploadDocument(client, dataset.id, doc);
      
      if (result) {
        // Wait for indexing (optional, can be slow)
        // await waitForIndexing(client, dataset.id, result.id);
        successCount++;
      } else {
        failCount++;
      }

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Summary
    log('\n' + '='.repeat(60), 'blue');
    log('  Setup Complete!', 'green');
    log('='.repeat(60), 'blue');
    log(`\nDataset ID: ${dataset.id}`, 'blue');
    log(`Dataset Name: ${dataset.name}`, 'blue');
    log(`\nDocuments uploaded: ${successCount}`, 'green');
    if (failCount > 0) {
      log(`Documents failed: ${failCount}`, 'red');
    }
    log(`\nTotal: ${documents.length} documents processed`, 'blue');

    log('\n📝 Next Steps:', 'yellow');
    log('1. Go to Dify console: https://cloud.dify.ai/datasets', 'yellow');
    log('2. Find your dataset: ' + dataset.name, 'yellow');
    log('3. Wait for all documents to finish indexing', 'yellow');
    log('4. Link dataset to your Dify app', 'yellow');
    log('5. Enable RAG in your app settings\n', 'yellow');

  } catch (error) {
    log('\n✗ Setup failed:', 'red');
    log(error.message, 'red');
    if (error.response?.data) {
      log('API Error Details:', 'red');
      log(JSON.stringify(error.response.data, null, 2), 'red');
    }
    process.exit(1);
  }
}

// Run setup
if (require.main === module) {
  setupKnowledgeBase()
    .then(() => {
      log('\n✓ Knowledge base setup completed successfully!', 'green');
      process.exit(0);
    })
    .catch(error => {
      log('\n✗ Setup failed with error:', 'red');
      console.error(error);
      process.exit(1);
    });
}

module.exports = { setupKnowledgeBase };