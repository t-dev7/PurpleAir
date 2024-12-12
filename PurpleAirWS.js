const puppeteer = require('puppeteer');
const nodemailer = require('nodemailer');
const winston = require("winston");
require('winston-daily-rotate-file');

// Logger Obj Creation for tracking events, information, and errors
var transport1 = new winston.transports.DailyRotateFile({
    level: 'info',
    filename: '%DATE%.log',
    datePattern:'MM_DD_YYYY',
    zippedArchive: false,
    maxSize: '20m',
    maxFiles: '7d'

});

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.align(), 
        winston.format.printf((info) => `[${info.timestamp}] - ${info.level}: ${info.message}`)
    ),
    transports: [
      transport1
    ],
  });

// Global Variables
var b_Alert = true;
var b_Warn = true;
const URL = 'https://map.purpleair.com/air-quality-standards-us-epa-aqi?opt=%2F1%2Flp%2Fa10%2Fp604800%2FcC0&select=4491#14.21/38.09204/-122.25228';
errRecipient = ['email@domain.com'];
recipient = ['email@domain.com', 'email@domain.com'];


// parse element text to grab AQI number
function parseAQ(text){
    var result = "";
    for(var i = 3; i <= 5; i++){
      if(text.charAt(i) >= 48 || text.charAt(i) <= 57){
        result += text.charAt(i);
      }
      else
        break;
    }
    return result;
  }
  
  // send alert email
  async function send_email(aqi, _subject, message, person) {
  
    var s_aqi = aqi.toString();
    // Create a transporter
    const transporter = nodemailer.createTransport({
      host:'your mail domain',
      port: mail port number,
    });
  
    // Define email options
    const mailOptions = {
      from: 'email@domain.com',
      to: person, // Multiple recipients
      subject: _subject ,
      text: 'AQI in the local area is ' + s_aqi + ". " + message
    };
  
    // Send the email
    try {
      const info = await transporter.sendMail(mailOptions);
      logger.info('Email sent:' + info.response);
    } catch (error) {
      console.error('Error sending email:', error);
    }
  }


async function run(){

  const browser = await puppeteer.launch({headless:true, ignoreHTTPSErros: true, args:[
    '--ignore-certificate-errors',
    '--ignore-certificate-errors-spki-list'
  ]});
    const page = await browser.newPage();
    var elementText = "";
    var aqi = 0;
    var startTimer = 0;
    var endTimer = 0;
    var execution = 0;
    
    
    try{
        startTimer = performance.now();


        // Navigate the page to a URL
        logger.info("Navigating to PurpleAir site...");
        await Promise.all([
        page.goto( URL, 
        { waitUntil: ['load', 'networkidle0'] }),   
        page.waitForSelector(".legend-tooltip-popup", { visible: true }),
        ]);   
        endTimer = performance.now();
        execution = endTimer - startTimer;
        logger.info("Successfully Navigated:" + String(execution) + " ms" );
    }   
    catch(err) {
        logger.error("Could not properly load site:" + err);
        logger.info("Retrying to load site...");
        send_email(aqi,"Error: Could not resolve URL. Program will retry in 10 minutes", errRecipient);
        await browser.close();
        return new Promise(resolve => setTimeout(resolve, 600000)); // Wait 1 second
        }


    startTimer = performance.now();
    logger.info("Waiting for tooltip to load...");
    const elements = await page.$$('.legend-tooltip-popup');
    endTimer = performance.now();
    execution = endTimer - startTimer;
    logger.info("Tooltip Successfully Loaded: "+ String(execution) + " ms" );
        
    

    

    for (const element of elements) {
    elementText= await page.evaluate(element => element.textContent, element);
    break;
    }

    // convert to int
    aqi = parseInt(parseAQ(elementText));


    // if aqi is 140-149 and this is first time reaching that number
    if(aqi >= 140 && aqi < 150 && b_Warn == true){
    b_Warn = false;
    send_email(aqi,
            "AQI Warning" ,"\nThe AQI will continue to be monitored and will alert if levels reach 150 or above.\n See link below for more details:\n" + URL,
            recipient);
    logger.warn("AQI Warning: AQI approaching threshold levels. Warning email sent");
    }
    // if aqi is 150/greater and it is first time
    else if(aqi >= 150 && b_Alert == true){
    b_Alert = false;
    b_Warn = false;
    send_email(aqi,
            "AQI ALERT!","\nThe AQI is at threshold levels. Please take neccessary measures and precautions.\n See link below for more details:\n" + URL,
            recipient);
    logger.warn("AQI Alert: AQI reached threshold levels. Alert email sent");
    }
    //if aqi reaches the lower cutoff levels and the alerts have been triggered/emails sent
    else if(aqi <= 135 && (b_Alert == false || b_Warn == false)){
    b_Alert = true;
    b_Warn = true;
    send_email(aqi,
            "AQI Levels Subsided", "The levels have subsided. AQI levels will continue to be monitored.\n See link below for more details:\n" + URL,
            recipient);
    logger.info("AQI levels subsided: Subsided email sent");
    }

    logger.info("AQI Level: " + String(aqi));
    logger.info("Closing browser...");
    await browser.close();
    
    logger.info("Headless browser closed. Starting 10 minute timer until next data pull");
    return new Promise(resolve => setTimeout(resolve, 600000)); // Wait 1 second
};

// function to run web scraper in an infinite loop
async function jobLoop() {
    while (true) {
      try {
        await run(); // Wait 1 second
      }  catch (e) {
         
      }
    }
 }

 //Start main loop
 logger.info("Entering main loop of program");
 jobLoop();










