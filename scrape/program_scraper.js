

import { firefox } from 'playwright';
import fs from 'fs/promises';

/**
 * @param {object} request - The context.request object (Playwright).
 * @param {object} params - { postData, headers } for the specific pipeline.
 * @param {string} programLevel - 'Undergraduate' or 'Graduate' (used if raw field is ambiguous).
 */

async function fetchProgramsInPages(request, { postData, headers }, programLevel) {
  const chunkSize = parseInt(postData.numberOfResults, 10) || 24;
  let firstResult = parseInt(postData.firstResult, 10) || 0;
  let totalCount = Infinity;

  const results = [];
  const seenUris = new Set();

  // Keep fetching in increments of chunkSize until we've reached totalCount
  while (firstResult < totalCount) {
    // Update the "firstResult" in postData each iteration
    postData.firstResult = String(firstResult);

    const response = await request.post(
      'https://www.ualberta.ca/api/coveo/rest/search/v2',
      {
        params: { organizationId: 'universityofalbertaproductionk9rdz87w' },
        headers,
        data: new URLSearchParams(postData).toString(),
      }
    );

    const jsonResponse = await response.json();
    const chunkResults = jsonResponse.results || [];

    // If the API provides totalCount or totalCountFiltered, use it
    totalCount = jsonResponse.totalCount ?? jsonResponse.totalCountFiltered ?? 0;

    // Deduplicate by URI in this pipeline
    for (const item of chunkResults) {
      if (!item.uri) continue;
      if (!seenUris.has(item.uri)) {
        seenUris.add(item.uri);
        results.push(item);
      }
    }

    firstResult += chunkSize;
    if (chunkResults.length === 0 || firstResult >= totalCount) {
      break;
    }
  }

  // Transform each item to minimal fields: { name, level, faculty }
  return results.map((item) => {
    const raw = item.raw || {};
    const name = raw['ua__program'] || item.title || 'Unknown Program';
    
    // Determine level from searchHub or a raw field.
    let level = programLevel;

    const facultyList = raw['ua__program_faculty'] || raw['ua__faculty'] || [];
    const faculty = Array.isArray(facultyList) ? facultyList.join(', ') : facultyList;

    return { name, level, faculty };
  });
}

/**
 * Fetch Undergraduate programs
 */
async function scrapeUndergrad(context) {
  const request = context.request;

  const headers = {
    accept: '*/*',
    'accept-language': 'en-US,en;q=0.9',
    authorization: 'Bearer xxa379dfb5-5b0b-43e7-aaef-e91f4fedb4e0',
    'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
    origin: 'https://www.ualberta.ca',
    referer: 'https://www.ualberta.ca/en/undergraduate-programs/index.html',
    'sec-ch-ua': '"Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'user-agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
  };

  const postData = {
    actionsHistory:
      '[{"name":"Query","time":"\\"2025-03-31T15:51:03.748Z\\""},{"name":"Query","time":"\\"2025-03-31T15:49:59.564Z\\""}]',
    referrer: '',
    analytics:
      '{"clientId":"c9d32f13-9fe9-c284-18bf-b6afc3513372","documentLocation":"https://www.ualberta.ca/en/undergraduate-programs/index.html#sort=relevancy","documentReferrer":"","pageId":"","actionCause":"interfaceLoad","customData":{"JSUIVersion":"2.10106.3;2.10106.3"},"originContext":"Search"}',
    visitorId: 'c9d32f13-9fe9-c284-18bf-b6afc3513372',
    isGuestUser: 'false',
    searchHub: 'ug-programs',
    locale: 'en',
    pipeline: 'ualberta-ug-programs',
    firstResult: '0',
    numberOfResults: '24',
    excerptLength: '200',
    enableDidYouMean: 'true',
    sortCriteria: 'relevancy',
    queryFunctions: '[]',
    rankingFunctions: '[]',
    groupBy:
      '[{"field":"@ua__program_theme","maximumNumberOfValues":11,"sortCriteria":"occurrences","injectionDepth":1000,"completeFacetWithStandardValues":true,"allowedValues":[]},{"field":"@ua__program_interests","maximumNumberOfValues":11,"sortCriteria":"occurrences","injectionDepth":1000,"completeFacetWithStandardValues":true,"allowedValues":[]},{"field":"@ua__program_faculty","maximumNumberOfValues":11,"sortCriteria":"occurrences","injectionDepth":1000,"completeFacetWithStandardValues":true,"allowedValues":[]},{"field":"@ua__ug_program_type","maximumNumberOfValues":11,"sortCriteria":"occurrences","injectionDepth":1000,"completeFacetWithStandardValues":true,"allowedValues":[]},{"field":"@ua__campus","maximumNumberOfValues":11,"sortCriteria":"occurrences","injectionDepth":1000,"completeFacetWithStandardValues":true,"allowedValues":[]},{"field":"@ua__program_college","maximumNumberOfValues":11,"sortCriteria":"occurrences","injectionDepth":1000,"completeFacetWithStandardValues":true,"allowedValues":[]}]',
    facetOptions: '{}',
    categoryFacets: '[]',
    retrieveFirstSentences: 'true',
    timezone: 'America/Edmonton',
    enableQuerySyntax: 'false',
    enableDuplicateFiltering: 'false',
    enableCollaborativeRating: 'false',
    debug: 'false',
    allowQueriesWithoutKeywords: 'true',
  };

  return await fetchProgramsInPages(request, { postData, headers }, 'Undergraduate');
}

/**
 * Fetch Graduate programs
 */
async function scrapeGrad(context) {
  const request = context.request;

  const headers = {
    accept: '*/*',
    'accept-language': 'en-US,en;q=0.9',
    authorization: 'Bearer xxa379dfb5-5b0b-43e7-aaef-e91f4fedb4e0',
    'content-type': 'application/x-www-form-urlencoded; charset="UTF-8"',
    origin: 'https://www.ualberta.ca',
    referer: 'https://www.ualberta.ca/en/graduate-programs/index.html',
    'sec-ch-ua': '"Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'user-agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
  };

  const postData = {
    actionsHistory:
      '[{"name":"Query","time":"\\"2025-03-31T16:42:32.505Z\\""},{"name":"Query","time":"\\"2025-03-31T16:40:03.768Z\\""},{"name":"Query","time":"\\"2025-03-31T16:26:04.935Z\\""},{"name":"Query","time":"\\"2025-03-31T15:51:03.748Z\\""},{"name":"Query","time":"\\"2025-03-31T15:49:59.564Z\\""}]',
    referrer: 'https://www.google.com/',
    visitorId: '',
    isGuestUser: 'false',
    searchHub: 'graduate-programs',
    locale: 'en',
    pipeline: 'ualberta-graduate-programs-new',
    firstResult: '0',
    numberOfResults: '24',
    excerptLength: '200',
    enableDidYouMean: 'true',
    sortCriteria: '@ua__grad_sub ascending',
    queryFunctions: '[]',
    rankingFunctions: '[]',
    groupBy:
      '[{"field":"@ua__program_degrees","maximumNumberOfValues":11,"sortCriteria":"occurrences","injectionDepth":1000,"completeFacetWithStandardValues":true,"allowedValues":[]},{"field":"@ua__program_type","maximumNumberOfValues":11,"sortCriteria":"occurrences","injectionDepth":1000,"completeFacetWithStandardValues":true,"allowedValues":[]},{"field":"@ua__program_mode","maximumNumberOfValues":11,"sortCriteria":"occurrences","injectionDepth":1000,"completeFacetWithStandardValues":true,"allowedValues":[]},{"field":"@ua__campus","maximumNumberOfValues":11,"sortCriteria":"occurrences","injectionDepth":1000,"completeFacetWithStandardValues":true,"allowedValues":[]},{"field":"@ua__facultydepartment","maximumNumberOfValues":10001,"sortCriteria":"alphaascending","injectionDepth":10000,"completeFacetWithStandardValues":true,"allowedValues":[]}]',
    categoryFacets: '[]',
    retrieveFirstSentences: 'true',
    timezone: 'America/Edmonton',
    enableQuerySyntax: 'false',
    enableDuplicateFiltering: 'false',
    enableCollaborativeRating: 'false',
    debug: 'false',
    allowQueriesWithoutKeywords: 'true',
  };

  return await fetchProgramsInPages(request, { postData, headers }, 'Graduate');
}

/**
 * Scrape both undergraduate and graduate programs, combine, deduplicate, and save to JSON
 */
async function main() {
  const browser = await firefox.launch({ headless: true });
  const context = await browser.newContext();

  try {
    // Fetch Undergrad programs
    const undergradPrograms = await scrapeUndergrad(context);

    // Fetch Grad programs
    const gradPrograms = await scrapeGrad(context);

    // Combine all
    const combined = [...undergradPrograms, ...gradPrograms];

    // Remove duplicates across both sets
    const seenSignature = new Set();
    const finalList = [];

    for (const item of combined) {
      const signature = `${item.name}||${item.level}||${item.faculty}`;
      if (!seenSignature.has(signature)) {
        seenSignature.add(signature);
        finalList.push(item);
      }
    }

    // Write to output file
    await fs.mkdir('output', { recursive: true });
    await fs.writeFile('output/all_programs_simplified.json', JSON.stringify(finalList, null, 2));
    console.log('All programs (UG + Grad) written to output/all_programs_simplified.json');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}

main();

