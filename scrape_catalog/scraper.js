import { firefox } from 'playwright';


async function scrapeClassroomAvailability(page) {
  const sessions = {};  // This will be merged at a higher level
  const errors = [];

  // Find all table rows that might contain classroom info
  const rows = await page.$$('table.table-striped tbody tr');

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const timeCell = await row.$('td:nth-child(3)');
    if (!timeCell) {
      errors.push(`Row ${i + 1}: Missing time cell`);
      continue;
    }

    try {
      // Get all sets of date/time/location within the row
      const dateElements = await timeCell.$$('.col:nth-child(3n-2)');
      const timeElements = await timeCell.$$('.col:nth-child(3n-1)');
      const locationElements = await timeCell.$$('.col:nth-child(3n)');

      // Process each set
      for (let j = 0; j < dateElements.length; j++) {
        try {
          // Extract course code from URL (e.g., BUS 201 from .../catalogue/course/bus/201)
          const url = page.url();
          const course = url.split('/').slice(-2).join(' ').toUpperCase();

          // Get capacity from the 2nd column
          const capacityCell = await row.$('td:nth-child(2)');
          const capacity = capacityCell ? parseInt((await capacityCell.textContent()).trim()) : null;

          const dates = (await dateElements[j].textContent()).replace('Calendar icon', '').trim();
          const time = (await timeElements[j].textContent()).replace('Clock icon', '').trim();
          const location = (await locationElements[j].textContent()).replace('Building icon', '').trim();

          if (!dates || !time || !location) {
            errors.push(`Row ${i + 1}, Set ${j + 1}: Empty data found - Dates: ${!!dates}, Time: ${!!time}, Location: ${!!location}`);
            continue;
          }

          // Initialize array for this location if it doesn't exist
          if (!sessions[location]) {
            sessions[location] = [];
          }

          // Add the session to the array for this location
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

  return { sessions, errors };  // Return the sessions object directly now
}

async function getCoursesForSubject(page, courseUrl) {
  await page.goto(courseUrl);
  const courseLinks = [];

  try {
    // Get all "View Available Classes" links
    const links = await page.$$('a.btn.btn-nav');

    for (const link of links) {
      const href = await link.getAttribute('href');
      if (href && href.includes('/catalogue/course/')) {
        courseLinks.push('https://apps.ualberta.ca' + href);
      }
    }
  } catch (error) {
    console.error(`Error getting course links from ${courseUrl}:`, error);
  }

  return courseLinks;
}

async function scrapeCatalogue(authCookie) {
  const browser = await firefox.launch();
  const context = await browser.newContext();

  // Set the authentication cookie
  await context.addCookies([
    {
      name: 'AppsAt.Auth',
      value: authCookie,
      domain: 'apps.ualberta.ca',
      path: '/',
    }
  ]);

  const page = await context.newPage();
  const allClassrooms = {};  // Changed to an object instead of array
  const allErrors = [];

  try {
    const subjectUrl = 'https://apps.ualberta.ca/catalogue/course/bus';
    const courseLinks = await getCoursesForSubject(page, subjectUrl);
    console.log('Course links for BUS:', courseLinks);

    if (courseLinks.length === 0) {
      allErrors.push(`No course links found for ${subjectUrl}`);
    }

    // Visit each course page and collect classroom data
    for (const courseUrl of courseLinks) {
      try {
        await page.goto(courseUrl);
        const { sessions, errors } = await scrapeClassroomAvailability(page);

        if (errors.length > 0) {
          allErrors.push({
            course: courseUrl,
            errors: errors
          });
        }

        // Merge sessions into allClassrooms
        for (const [location, sessionArray] of Object.entries(sessions)) {
          if (!allClassrooms[location]) {
            allClassrooms[location] = [];
          }
          allClassrooms[location].push(...sessionArray);
        }
      } catch (error) {
        allErrors.push({
          course: courseUrl,
          error: `Failed to scrape: ${error.message}`
        });
      }
    }

  } catch (error) {
    allErrors.push(`Catalog scraping error: ${error.message}`);
  } finally {
    await browser.close();
  }

  // Log all errors if any occurred
  if (allErrors.length > 0) {
    console.error('Scraping completed with the following errors:');
    console.error(JSON.stringify(allErrors, null, 2));
  }

  return allClassrooms;  // Return the object directly
}

async function main() {
  const authCookie = process.env.AUTH_COOKIE;
  if (!authCookie) {
    throw new Error('AUTH_COOKIE environment variable is required');
  }

  try {
    const results = await scrapeCatalogue(authCookie);
    console.log('Classroom availability:');
    console.log(JSON.stringify(results, null, 2));
  } catch (error) {
    console.error('Fatal error running scraper:', error);
  }
}

main();

