'use strict';

/** @enum {number} */
const readoutUnits = {
  mph: 2.23694,
  kmh: 3.6
};

/** @const */
const appOpts = {
  dom: {
    body: document.querySelector('body'),
    start: document.querySelector('#start'),
    readout: document.querySelector('#readout'),
    showMph: document.querySelector('#show-mph'),
    showKmh: document.querySelector('#show-kmh'),
  },
  readoutUnit: readoutUnits.mph,
  watchId: null,
  wakeLock: null
};

document.querySelector('#show-mph').addEventListener('click', (event) => {
  appOpts.readoutUnit = readoutUnits.mph;
  if (!appOpts.dom.showMph.classList.contains('selected')) {
    toggleReadoutButtons();
  }
});

document.querySelector('#show-kmh').addEventListener('click', (event) => {
  appOpts.readoutUnit = readoutUnits.kmh;
  if (!appOpts.dom.showKmh.classList.contains('selected')) {
    toggleReadoutButtons();
  }
});

document.querySelector('#start').addEventListener('click', (event) => {
  if (appOpts.watchId) {
    navigator.geolocation.clearWatch(appOpts.watchId);

    if (appOpts.wakeLock) {
      appOpts.wakeLock.cancel();
    }

    appOpts.watchId = null;
    appOpts.dom.start.textContent = '🔑 Start';
    appOpts.dom.start.classList.toggle('selected');
  } else {
    const options = {
      enableHighAccuracy: true
    };
    appOpts.watchId = navigator.geolocation.watchPosition(parsePosition,
      null, options);
    startWakeLock();

    appOpts.dom.start.textContent = '🛑 Stop';
    appOpts.dom.start.classList.toggle('selected');
  }
});

const toggleReadoutButtons = () => {
  appOpts.dom.showKmh.classList.toggle('selected');
  appOpts.dom.showMph.classList.toggle('selected');
};

const startAmbientSensor = () => {
  if ('AmbientLightSensor' in window) {
    navigator.permissions.query({ name: 'ambient-light-sensor' })
      .then(result => {
        if (result.state === 'denied') {
          return;
        }
        const sensor = new AmbientLightSensor({frequency: 0.25});
        sensor.addEventListener('reading', () => {
          if (sensor['illuminance'] < 3 && !appOpts.dom.body.classList.contains('dark')) {
            appOpts.dom.body.classList.toggle('dark');
          } else if (sensor['illuminance'] > 3 && appOpts.dom.body.classList.contains('dark')) {
            appOpts.dom.body.classList.toggle('dark');
          };
        });
        sensor.start();
    });
  }
}

const startWakeLock = () => {
  try {
    navigator.getWakeLock("screen").then((wakeLock) => {
      appOpts.wakeLock = wakeLock.createRequest();
    });
  } catch(error) {
    // no experimental wake lock api build
  }
}

const parsePosition = (position) => {
  console.log(position);
  const speedInKmh = position.coords.speed * readoutUnits.kmh;

  const speedParagraph = document.getElementById("currentspeed");
  speedParagraph.textContent = `${Math.round(speedInKmh)} km/h`;

  const locationParagraph = document.getElementById("location");  
  locationParagraph.textContent = `Latitude: ${position.coords.latitude}, Longitude: ${position.coords.longitude}`;

  // "latitude": 22.523144,
  //  "longitude": 75.924728,

  //Fetch the radius data 
   //Fetch the radius data 
   fetch('database.json')
   .then(response => response.json())
   .then(data => {
     // Search for a matching entry in the database
     const matchingEntry = data.find(entry => {
       return (
        //  entry.latitude === 22.523144 &&
        //  entry.longitude === 75.924728
         entry.latitude === position.coords.latitude &&
         entry.longitude === position.coords.longitude
       );
     });

     // Display the radius if a matching entry is found
     if (matchingEntry) {
       const radiusParagraph = document.getElementById("radius");
       radiusParagraph.textContent = `Radius: ${matchingEntry.radius}`;

       // Calculate and display the safe speed
       const safeSpeedParagraph = document.getElementById("safespeed");
       if (matchingEntry.radius !== undefined) {
         const safeSpeed = (88.87 - (2554.76 / matchingEntry.radius)) * (0.278) * (18/5);
         safeSpeedParagraph.textContent = `Safe Speed: ${Math.round(safeSpeed)} km/h`;

         // Calculate and display the design speed
         const designSpeedParagraph = document.getElementById("designspeed");
         const designSpeed = Math.sqrt((0.22) * 9.8 * matchingEntry.radius) * (18/5);
         designSpeedParagraph.textContent = `Design Speed: ${Math.round(designSpeed)} km/h`;

         // Check if current speed exceeds either design speed or safe speed and display warnings
         const warningParagraph = document.getElementById("warning");
         if (safeSpeed > speedInKmh || designSpeed > speedInKmh) {
           warningParagraph.textContent = "Warning: Speed Limit Exceeded!";
         } else {
           warningParagraph.textContent = "";
         }
       } else {
         safeSpeedParagraph.textContent = `Safe Speed: N/A`;
         designSpeedParagraph.textContent = `Design Speed: N/A`;
         warningParagraph.textContent = "";
       }
     }
   })
   .catch(error => {
     console.error('Error loading the database:', error);
   });
};

const startServiceWorker = () => {
  navigator.serviceWorker.register('service-worker.js', {
    scope: './'
  });
}

startAmbientSensor();
startServiceWorker();