### Overview
This project walks you through how you can use the Watson Data Platform to build a solution that ingests data from a 3rd party source, like FitBit, and stores it into Cloudant and then use the Data Science Experience to transform/analyze your datasets. Here is a sample of the [Data Science Experience Notebook](https://apsportal.ibm.com/analytics/notebooks/14971e0a-252a-4208-98dd-fe6576b0e505?projectid=c3c1d5c5-c74c-4ccf-9e14-300213b233b0&context=analytics)

### Pre-requisites
1.	Create a [Bluemix trial account](https://developer.ibm.com/sso/bmregistration?lang=en_US&ca=dw-_-apiconnect-_-1-_-course)
2.	Provision the [Node.JS Cloud Foundry app](https://console.bluemix.net/catalog/starters/sdk-for-nodejs?region=ibm:yp:us-south&org=080d33b8-2960-44c0-9600-cd63d007f557&space=80789515-238a-4920-9168-e5462de4adef&org_region=us-south&is_org_manager=true&bss_account=8eb0eb4616e77cf88cc532f068fe1048&env_id=ibm:yp:us-south&taxonomyNavigation=apps)
3.	Provision the [Cloudant NoSQL DB](https://console.bluemix.net/catalog/services/cloudant-nosql-db?env_id=ibm:yp:us-south&taxonomyNavigation=apps)
4.	Provision the [Data Science Experience](https://console.bluemix.net/catalog/services/data-science-experience?env_id=ibm:yp:us-south&taxonomyNavigation=cf-apps)
5.	[Register your FitBit application](https://dev.fitbit.com/docs/)
6. [CF CLI](https://github.com/cloudfoundry/cli#getting-started)

### Getting Started
1. Fork the repository
2. Set the credentials in your `.env` file, you can use the `.env.example` file as a template.
3. Open the `src/public/partials/dashboard-btn.ejs` and find the replace the `<YOUR_DSX_SHAREDNOTEBOOK_URL_HERE>` with your DSX shared notebook URL
4. Open the `src/public/index.ejs` and replace the `<YOUR_FITBIT_API_REGISTRATION_URL>` with your FitBit registration URL
5. Update the `manifest.yml` file to include your Node.js app name in Bluemix
6. Push your application to bluemix using the CF CLI `cf push -f manifest.yml`

***NOTE: You might be charged for provisioning the applications to Bluemix, please view the pricing plans and make sure you understand the charges.***

### Contributing
If you would like to improve this tutorial, feel free to fork the repository and create a PR or open an issue.
