import { firefox } from 'playwright';
import fs from 'fs/promises';

async function getAllSubjects(page) {
  await page.goto('https://apps.ualberta.ca/catalogue/course');

  const subjectLinks = await page.$$('a[href^="/catalogue/course/"]');
  const subjects = [];

  console.log("Scraped subjects:");

  for (const link of subjectLinks) {
    const href = await link.getAttribute('href');
    if (href) {
      // Extract subject code 
      const subjectCode = href.split('/').pop();
      subjects.push({ code: subjectCode, url: 'https://apps.ualberta.ca' + href });
      // Print each subject
      console.log(`- ${subjectCode} -> ${href}`);
    }
  }

  console.log(`Total subjects found: ${subjects.length}`);  // Summary print
  return subjects;
}

async function getCoursesForSubject(page, subjectUrl) {
  await page.goto(subjectUrl);
  const courseLinks = [];

  try {
    // "View Available Classes" buttons
    const links = await page.$$('a.btn.btn-nav');
    for (const link of links) {
      const href = await link.getAttribute('href');
      if (href && href.includes('/catalogue/course/')) {
        courseLinks.push('https://apps.ualberta.ca' + href);
      }
    }
  } catch (error) {
    console.error(`Error getting course links from ${subjectUrl}:`, error);
  }

  return courseLinks;
}

async function scrapeClassroomAvailability(page) {
  const sessions = {};
  const errors = [];

  const rows = await page.$$('table.table-striped tbody tr');

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const timeCell = await row.$('td:nth-child(3)');
    if (!timeCell) {
      errors.push(`Row ${i + 1}: Missing time cell`);
      continue;
    }

    try {
      const dateElements = await timeCell.$$('.col:nth-child(3n-2)');
      const timeElements = await timeCell.$$('.col:nth-child(3n-1)');
      const locationElements = await timeCell.$$('.col:nth-child(3n)');

      for (let j = 0; j < dateElements.length; j++) {
        try {
          const url = page.url();
          const course = url.split('/').slice(-2).join(' ').toUpperCase();
          const capacityCell = await row.$('td:nth-child(2)');
          const capacity = capacityCell ? parseInt((await capacityCell.textContent()).trim()) : null;
          const dates = (await dateElements[j].textContent()).replace('Calendar icon', '').trim();

          // Check which element contains the building icon
          const secondElement = await timeElements[j].innerHTML();
          const thirdElement = await locationElements[j].innerHTML();

          let time, location;
          if (thirdElement.includes('Building icon')) {
            // Normal case
            time = (await timeElements[j].textContent()).replace('Clock icon', '').trim();
            location = (await locationElements[j].textContent()).replace('Building icon', '').trim();
          } else if (secondElement.includes('Building icon')) {
            // Weird edge case where it swaps the Time and Location columns
            time = (await locationElements[j].textContent()).replace('Clock icon', '').trim();
            location = (await timeElements[j].textContent()).replace('Building icon', '').trim();
          } else {
            errors.push(`Row ${i + 1}, Set ${j + 1}: Could not find building icon`);
            continue;
          }

          if (!dates || !time || !location) {
            errors.push(`Row ${i + 1}, Set ${j + 1}: Empty data found`);
            continue;
          }

          if (!sessions[location]) {
            sessions[location] = [];
          }

          sessions[location].push({
            dates,
            time,
            location,
            capacity,
            course
          });
        } catch (error) {
          errors.push(`Row ${i + 1}, Set ${j + 1}: Error extracting data - ${error.message}`);
        }
      }
    } catch (error) {
      errors.push(`Row ${i + 1}: Error processing row - ${error.message}`);
    }
  }

  return { sessions, errors };
}

async function scrapeCatalogue(authCookie) {
  const browser = await firefox.launch();
  // const browser = await firefox.launch({ 
  //   headless: false,
  //   slowMo: 50  // Optional: adds a delay between actions for better visibility
  // });
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
  const allClassrooms = {};
  const allErrors = [];

  try {
    // Step 1: Get all subjects dynamically
    const subjects = await getAllSubjects(page);
    console.log(`Found ${subjects.length} subjects.`);

    for (const { code, url } of subjects) {
      console.log(`Scraping subject: ${code}`);

      const courseLinks = await getCoursesForSubject(page, url);
      if (courseLinks.length === 0) {
        allErrors.push(`No course links found for ${code}`);
        continue;
      }

      // Step 2: Scrape each course page
      for (const courseUrl of courseLinks) {
        try {
          await page.goto(courseUrl);
          const { sessions, errors } = await scrapeClassroomAvailability(page);

          if (errors.length > 0) {
            allErrors.push({ course: courseUrl, errors });
          }

          for (const [location, sessionArray] of Object.entries(sessions)) {
            if (!allClassrooms[location]) {
              allClassrooms[location] = [];
            }
            allClassrooms[location].push(...sessionArray);
          }
        } catch (error) {
          allErrors.push({ course: courseUrl, error: `Failed to scrape: ${error.message}` });
        }
      }
    }
  } catch (error) {
    allErrors.push(`Catalog scraping error: ${error.message}`);
  } finally {
    await browser.close();
  }

  if (allErrors.length > 0) {
    console.error('Scraping completed with errors:', JSON.stringify(allErrors, null, 2));
  }

  return { allClassrooms, allErrors };
}

async function saveToJson(data, filename) {
  try {
    // Ensure output directory exists
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
    const { allClassrooms, allErrors } = await scrapeCatalogue(authCookie);

    console.log('Classroom availability scraped successfully and saved to classroom_availability.json');
    await saveToJson(allClassrooms, 'classroom_availability.json');

    // Save errors if there are any
    if (allErrors.length > 0) {
      await saveToJson(allErrors, 'scraping_errors.json');
      console.log(`Found ${allErrors.length} errors during scraping. Check scraping_errors.json for details.`);
    }
  } catch (error) {
    console.error('Fatal error running scraper:', error);
    // Save fatal error
    await saveToJson({
      fatalError: error.message,
      timestamp: new Date().toISOString()
    }, 'fatal_error.json');
  }
}

main();
