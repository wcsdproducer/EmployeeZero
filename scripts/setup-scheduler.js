const { google } = require('googleapis');

async function main() {
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
  });

  const client = await auth.getClient();
  const projectId = 'employee-zero-production';
  const location = 'us-central1'; // Assuming us-central1
  
  const scheduler = google.cloudscheduler({ version: 'v1', auth: client });

  const parent = `projects/${projectId}/locations/${location}`;
  
  // List jobs
  const res = await scheduler.projects.locations.jobs.list({ parent });
  console.log("Current Jobs:", res.data.jobs || []);

  const jobName = `${parent}/jobs/blog-generator`;

  // Create or Update Job
  const jobConfig = {
    name: jobName,
    description: 'Daily automated blog generator for Employee Zero',
    schedule: '0 9 * * *', // 9 AM everyday
    timeZone: 'America/New_York',
    httpTarget: {
      uri: 'https://employeezero.app/api/blog/generate',
      httpMethod: 'POST',
      headers: {
        'Authorization': `Bearer 7dcf17353eb27b84d1df82f64d15fe9927e0df3672d8d9013c4ecd42af20f20a`,
        'Content-Type': 'application/json'
      },
      body: Buffer.from('{}').toString('base64'),
    }
  };

  try {
    const existing = await scheduler.projects.locations.jobs.get({ name: jobName });
    console.log("Job exists, updating...");
    await scheduler.projects.locations.jobs.patch({
      name: jobName,
      requestBody: jobConfig
    });
    console.log("Job updated successfully.");
  } catch (err) {
    if (err.code === 404) {
      console.log("Job not found, creating...");
      await scheduler.projects.locations.jobs.create({
        parent,
        requestBody: jobConfig
      });
      console.log("Job created successfully.");
    } else {
      console.error("Error checking/creating job:", err.message);
    }
  }
}

main().catch(console.error);
