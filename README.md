# Dead by Daylight 3.0.0-dev Server

## What is this?

This server can be used in order to launch and play the 3.0.0 developer build of Dead by Daylight.

## Why?

Because alternative fixes use Behaviour's servers and may not work forever. Additionally, by using this server and setting it up properly, no data is sent to Behaviour's servers.

## How to run

1. Make sure [NodeJS](https://nodejs.org/en/) 18 LTS (16 and 14 also tested) and [NPM](https://www.npmjs.com/) are installed on the machine you wish to run the server on.
1. [Download](https://github.com/Preston159/dbd-server/releases) and extract the newest release.
1. Run `setup.bat` (or `setup.sh` on Linux) to install all necessary dependencies.
1. Run `run.bat` (or `run.sh` on Linux) to start the server.

## How to use

1. Add the following lines to the end of DefaultEngine.ini (located in DeadByDaylight/Config). Note: depending on where you downloaded the dev build from, this step may already be done.
    ```
    [/Script/Engine.NetworkSettings]
    n.VerifyPeer=false
    ```
1. Add the following entries to your HOSTS file, replacing `127.0.0.1` with the IP of the server if it isn't your local machine. Do not replace the IP in the third line, which is meant to sinkhole to 0.0.0.0 regardless of the location of the server. If you're not sure how to edit your HOSTS file, check [here](https://www.howtogeek.com/howto/27350/beginner-geek-how-to-edit-your-hosts-file/).
    ```
    127.0.0.1   latest.dev.dbd.bhvronline.com
    127.0.0.1   cdn.dev.dbd.bhvronline.com
    0.0.0.0     analytic.live.dbd.bhvronline.com
    ```
1. Launch the game using DeadByDaylight.bat.

## Contributions

Pull requests are welcome, but try to stick to the style of surrounding code when making additions or modifications. Please ensure all changes are non-breaking and all code is either well-documented or self-documenting. Always ensure modifications pass linting by running `npm run lint`, as PRs which fail linting will not be considered.

If you think something could be improved or fixed but don't want to do it yourself, [create an issue](https://github.com/Preston159/dbd-server/issues/new)! Please include as much information as possible in issues, especially when concerning a bug.

## Contributors

- [Midnoclose](https://github.com/Midnoclose)


# Copyright Notice

[Dead by Daylight](https://deadbydaylight.com/en)&trade; (DbD) is a trademark of [Behaviour Interactive](https://www.bhvr.com/).