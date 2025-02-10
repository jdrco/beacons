import { Worker } from 'worker_threads';
import { firefox } from 'playwright';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function getAllSubjects(page) {
  await page.goto('https://apps.ualberta.ca/catalogue/course');
  const subjectLinks = await page.$$('a[href^="/catalogue/course/"]');
  const subjects = [];

  for (const link of subjectLinks) {
    const href = await link.getAttribute('href');
    if (href) {
      const subjectCode = href.split('/').pop();
      subjects.push({ code: subjectCode, url: 'https://apps.ualberta.ca' + href });
    }
  }
  
  return subjects;
}

async function partitionSubjects(authCookie) {
  const browser = await firefox.launch();
  const context = await browser.newContext();
  await context.addCookies([
    {
      name: 'AppsAt.Auth',
      value: authCookie,
      domain: 'apps.ualberta.ca',
      path: '/',
    }
  ]);

  const page = await context.newPage();
  const subjects = await getAllSubjects(page);
  await browser.close();

  const NUM_THREADS = 8;
  const subjectsPerThread = Math.ceil(subjects.length / NUM_THREADS);
  const partitions = [];

  for (let i = 0; i < NUM_THREADS; i++) {
    const start = i * subjectsPerThread;
    const end = Math.min(start + subjectsPerThread, subjects.length);
    partitions.push(subjects.slice(start, end));
  }

  return partitions;
}

async function mergeResults(threadResults) {
  const allClassrooms = {};
  const allErrors = [];

  // Merge classrooms data
  for (const result of threadResults) {
    for (const [location, sessions] of Object.entries(result.classrooms)) {
      if (!allClassrooms[location]) {
        allClassrooms[location] = [];
      }
      allClassrooms[location].push(...sessions);
    }
    if (result.errors.length > 0) {
      allErrors.push(...result.errors);
    }
  }

  return { allClassrooms, allErrors };
}

async function saveToJson(data, filename) {
  try {
    await fs.mkdir('output', { recursive: true });
    const filepath = `output/${filename}`;
    await fs.writeFile(filepath, JSON.stringify(data, null, 2));
    console.log(`Data successfully saved to ${filepath}`);
  } catch (error) {
    console.error(`Error saving to output/${filename}:`, error);
  }
}

async function main() {
  const authCookie = process.env.AUTH_COOKIE;
  if (!authCookie) {
    throw new Error('AUTH_COOKIE environment variable is required');
  }

  try {
    console.log('Getting subject partitions...');
    const partitions = await partitionSubjects(authCookie);
    console.log(`Created ${partitions.length} partitions`);

    const workers = [];
    const threadResults = [];

    // Create and start workers
    for (let i = 0; i < partitions.length; i++) {
      const worker = new Worker('./worker.js', {
        workerData: {
          subjects: partitions[i],
          authCookie,
          threadId: i
        }
      });

      workers.push(
        new Promise((resolve, reject) => {
          worker.on('message', (result) => {
            threadResults.push(result);
            console.log(`Thread ${i} completed: processed ${partitions[i].length} subjects`);
          });

          worker.on('error', reject);
          worker.on('exit', (code) => {
            if (code !== 0) {
              reject(new Error(`Worker ${i} stopped with exit code ${code}`));
            }
            resolve();
          });
        })
      );
    }

    // Wait for all workers to complete
    await Promise.all(workers);
    console.log('All threads completed');

    // Merge results from all threads
    const { allClassrooms, allErrors } = await mergeResults(threadResults);

    // Save final results
    await saveToJson(allClassrooms, 'classroom_availability.json');
    if (allErrors.length > 0) {
      await saveToJson(allErrors, 'scraping_errors.json');
      console.log(`Found ${allErrors.length} errors during scraping`);
    }

  } catch (error) {
    console.error('Fatal error running scraper:', error);
    await saveToJson({
      fatalError: error.message,
      timestamp: new Date().toISOString()
    }, 'fatal_error.json');
  }
}

main();