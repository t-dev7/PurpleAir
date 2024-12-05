// Author: Trevor Davis
// Company: VFWD
// Date: 12/05/2024  

const puppeteer = require('puppeteer');
const nodemailer = require('nodemailer');

var b_Alert = true;
var b_Warn = true;


  function getAQI(){
    return new Promise(resolve => {
  (async () => {
    // Launch the browser and open a new blank page
    //const browser = await puppeteer.launch();
    const browser = await puppeteer.launch({headless:true})
    const page = await browser.newPage();
    var elementText = "";
    var aqi = 0;
    
    

    // Navigate the page to a URL.
    await Promise.all([
    page.goto('https://map.purpleair.com/air-quality-standards-us-epa-aqi?opt=%2F1%2Flp%2Fa10%2Fp604800%2FcC0&select=4491#14.21/38.09204/-122.25228', 
      { waitUntil: ['load', 'networkidle0'] }),   
      page.waitForSelector(".legend-tooltip-popup", { visible: true }),
      ]);

    const elements = await page.$$('.legend-tooltip-popup');

    
    for (const element of elements) {
      elementText= await page.evaluate(element => element.textContent, element);
      break;
    }

    // convert to int
    aqi = parseInt(parseAQ(elementText));

    // if aqi is 140-149 and this is first time reaching that number
    if(aqi >= 140 && aqi < 150 && b_Warn == true){
      b_Warn = false;
      send_email(aqi,"AQI Warning" ,"\nThe AQI will continue to be monitored and will alert if levels reach 150 or above.")
    }
    // if aqi is 150/greater and it is first time
    else if(aqi >= 150 && b_Alert == true){
      b_Alert = false;
      b_Warn = false;
      send_email(aqi,"AQI ALERT!","\nThe AQI is at threshold levels. Please take neccessary measures and precautions.")
    }
    //if aqi reaches the lower cutoff levels and the alerts have been triggered/emails sent
    else if(aqi <= 135 && (b_Alert == true || b_Warn == true)){
      b_Alert = true;
      b_Warn = true;
      send_email(aqi,"AQI Levels Subsided", "The levels have subsided. AQI levels will continue to be monitored.")
    }


    await browser.close();


  })();
  
  // Recursive loop that runs every 10 min
  setTimeout(() => {
    resolve(getAQI()); // Recursive call
  }, 600000); // Ensure asynchronous execution
  });
}

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
async function send_email(aqi, _subject, message) {

  var s_aqi = aqi.toString();
  // Create a transporter
  const transporter = nodemailer.createTransport({
    host:'domain',
    port: port,
  });

  // Define email options
  const mailOptions = {
    from: 'sender@domain.com',
    to: ['recipient@domain.com'], // Multiple recipients
    subject: _subject ,
    text: 'AQI in the local area is ' + s_aqi + ". " + message
  };

  // Send the email
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.response);
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

let counter = 0;




   getAQI().then(
     function () {
       console.log(counter++);
     }
   );

