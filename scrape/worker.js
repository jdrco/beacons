import { parentPort, workerData } from 'worker_threads';
import { firefox } from 'playwright';

async function getCoursesForSubject(page, subjectUrl) {
  await page.goto(subjectUrl);
  const courseLinks = [];

  try {
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

  const winterTermHeading = await page.$('h2:has-text("Winter Term 2025")');
  if (!winterTermHeading) {
    errors.push('Winter Term 2025 section not found');
    return { sessions, errors };
  }

  const winterTermSection = await winterTermHeading.evaluateHandle(el => el.closest('div.mb-5'));
  if (!winterTermSection) {
    errors.push('Could not find Winter term content section');
    return { sessions, errors };
  }

  const rows = await winterTermSection.$$('table.table-striped tbody tr');
  if (!rows.length) {
    errors.push('No rows found in Winter term section');
    return { sessions, errors };
  }

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

          const secondElement = await timeElements[j].innerHTML();
          const thirdElement = await locationElements[j].innerHTML();

          let time, location;
          if (thirdElement.includes('Building icon')) {
            time = (await timeElements[j].textContent()).replace('Clock icon', '').trim();
            location = (await locationElements[j].textContent()).replace('Building icon', '').trim();
          } else if (secondElement.includes('Building icon')) {
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

async function workerFunction() {
  const { subjects, authCookie, threadId } = workerData;
  const classrooms = {};
  const errors = [];

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

  try {
    for (const { code, url } of subjects) {
      console.log(`Thread ${threadId}: Scraping subject ${code}`);
      
      const courseLinks = await getCoursesForSubject(page, url);
      if (courseLinks.length === 0) {
        errors.push(`No course links found for ${code}`);
        continue;
      }

      for (const courseUrl of courseLinks) {
        try {
          await page.goto(courseUrl);
          const { sessions, errors: courseErrors } = await scrapeClassroomAvailability(page);

          if (courseErrors.length > 0) {
            errors.push({ course: courseUrl, errors: courseErrors });
          }

          for (const [location, sessionArray] of Object.entries(sessions)) {
            if (!classrooms[location]) {
              classrooms[location] = [];
            }
            classrooms[location].push(...sessionArray);
          }
        } catch (error) {
          errors.push({ course: courseUrl, error: `Failed to scrape: ${error.message}` });
        }
      }
    }
  } catch (error) {
    errors.push(`Thread ${threadId} error: ${error.message}`);
  } finally {
    await browser.close();
  }

  // Send results back to main thread
  parentPort.postMessage({ classrooms, errors });
}

workerFunction();