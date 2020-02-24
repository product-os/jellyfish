# Running Jellyfish on balena

This document will explain how to get Jellyfish up and running on a balena device, in this case an Intel NUC. This, however, can be easily done on any other balena device that has enough system resources to run Jellyfish.

## Prepare the Device
1. Create a new balenaCloud app as described [here](https://www.balena.io/docs/learn/getting-started/intel-nuc/nodejs/)
2. After your device shows up in the dashboard device list, switch it to local mode as described [here](https://www.balena.io/docs/learn/develop/local-mode/)

## Deploy Code
Now that the device is up and running in local mode, we need to get its local IP address:
```
$ sudo balena scan
Reporting scan results
-
  host:          b830732.local
  address:       <LOCAL-IP-ADDRESS>
  dockerInfo:
    Containers:        1
    ContainersRunning: 1
    ContainersPaused:  0
    ContainersStopped: 0
    Images:            2
    Driver:            aufs
    SystemTime:        2020-02-24T06:45:56.291958229Z
    KernelVersion:     5.2.10-yocto-standard
    OperatingSystem:   balenaOS 2.47.0+rev1
    Architecture:      x86_64
  dockerVersion:
    Version:    18.09.10-dev
    ApiVersion: 1.39
```

And finally, we can livepush the Jellyfish code to the device using its local IP address:
```
$ cd jellyfish
$ balena push <LOCAL-IP-ADDRESS>
```

Once the push and build is complete, Jellyfish will begin running and you will see logs printing out live to your terminal:
```
...
[Live]    Device state settled
[Logs]    [2/24/2020, 5:07:52 PM] [tick] (26.0.0) 2020-02-24T08:07:52.170Z [worker/index] [info] [TICK-REQUEST-81eb3998-47a6-45b1-ba65-28b0cf0b165b]: Processing tick request {"triggers":39}
[Logs]    [2/24/2020, 5:07:54 PM] [tick] (26.0.0) 2020-02-24T08:07:54.174Z [worker/index] [info] [TICK-REQUEST-d7a70fc1-cdb1-4608-bbe9-6216256ad316]: Processing tick request {"triggers":39}
[Logs]    [2/24/2020, 5:07:56 PM] [tick] (26.0.0) 2020-02-24T08:07:56.179Z [worker/index] [info] [TICK-REQUEST-d6fb8fe4-093a-428f-a09f-d5b04e70bd02]: Processing tick request {"triggers":39}
[Logs]    [2/24/2020, 5:07:57 PM] [api] (26.0.0) 2020-02-24T08:07:57.099Z [server/http/middlewares] [info] [REQUEST-26.0.0-51499bb7-e103-46cb-82bd-4758f8a3e26d]: HTTP request start {"ip":"::ffff:172.18.0.11","uri":"/ping"}
[Logs]    [2/24/2020, 5:07:57 PM] [api] (26.0.0) 2020-02-24T08:07:57.102Z [server/http/routes] [info] [REQUEST-26.0.0-51499bb7-e103-46cb-82bd-4758f8a3e26d]: Got type card {"slug":"ping","time":1}
[Logs]    [2/24/2020, 5:07:57 PM] [api] (26.0.0) 2020-02-24T08:07:57.102Z [queue/index] [info] [REQUEST-26.0.0-51499bb7-e103-46cb-82bd-4758f8a3e26d]: Enqueueing request {"actor":"0abbe147-669c-4745-bb84-b9878ca0f40d","request":{"slug":"action-request-52782a97-9d0f-4523-872c-056c852d263a","action":"action-ping@1.0.0","card":"505c584f-e7d1-4323-bfe5-87366184e117"}}
...
```

Now that Jellyfish is up and running, you can begin modifiying code locally and the corresponding code will be automatically updated on your device.

## Update Hosts
If you are unable to access Jellyfish by pointing your browser to `http://jel.ly.fish.local`, you may need to map your devices local IP to Jellyfish names in your `hosts` file:
```
<LOCAL-IP-ADDRESS> livechat.ly.fish.local api.ly.fish.local jel.ly.fish.local
```

You should now be able to access Jellyfish by opening your browser to `http://jel.ly.fish.local`.

## Gotchas
- Keep in mind that some changes may cause the livepush build to take longer than others.
- There is currently an issue in which editing a single apps file, such as `apps/server/http/routes.js`, will cause all other apps to be rebuilt resulting in longer iterations.
