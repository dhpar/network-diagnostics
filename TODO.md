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

## DONE

A section to keep track of completed work.

- [x] Initialized project repository.
