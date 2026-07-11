# TODO

## General

This is a general task section.

- [ ] Move devices and IPs to a context provider to be able to access to it accross the app.
- [ ] Finish up wiring the Traceroute tab.
  - Similar layout than Devices?
- [ ] Fix the Wifi tab.
- [ ] Switch to Suspense.
- [ ] Implement React Router while switching tabs.
- [ ] Connected Icon is inconsistent, find a way to make it more relevant, maybe using the `/api/ping/<ip>` endpoint?
  - ~~Should make all the other queries dependants on this one? ie: If this query fails do not run all the others?~~ Doesn't make sense, since is that is the main goal of this app, to run the other queries and figure out where the network issue is.
- [ ] Implement direct communication with router.
- [ ] Implement database storage in backend, in order to show historical data, assign names to IPs (ie: 192.168.0.23 is a smart outlet).
- [ ] Implement fake DHCP detection via Scapy.
- [ ] Move to a totally dockerized execution native on windows. This should allow direct accesss to wifi phisical layer, AKA: signal strengh, Signal-Noise Ratio, chanels, wifi name...
- [ ] Implement an endpoint to check if relevant services are down: is Netflix down?, is Disney plus down?, is quantum fiber down?,...
  - Fetch request to check for quantum fiber outage:

    ```javascript
    fetch("https://www.quantumfiber.com/on/demandware.store/Sites-QFCC-Site/default/MPOutageTool-RenderOutageMapByAddr", {"headers": { "accept": "*/*",
    "accept-language": "en-US,en;q=0.9,ca-ES;q=0.8,ca;q=0.7,es-ES;q=0.6,es;q=0.5",
    "cache-control": "no-cache",
    "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
    "pragma": "no-cache",
    "priority": "u=1, i",
    "sec-ch-ua": "\"Chromium\";v=\"142\", \"Google Chrome\";v=\"142\", \"Not_A Brand\";v=\"99\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"Windows\"",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "x-requested-with": "XMLHttpRequest"},"referrer": "<https://www.quantumfiber.com/outagetool>","body": "latitude=44.9247150&longitude=-93.3345530&unit=&serviceAddress=4232+GRIMES+AVE%2CMINNEAPOLIS%2CMN+55416%2CUSA&streetNum=4232&street=GRIMES+AVE&city=MINNEAPOLIS&stateCode=MN&countryCode=USA&zipcode=55416","method": "POST","mode": "cors","credentials": "include"});

    ```

## DONE

A section to keep track of completed work.

- [x] Initialized project repository.
