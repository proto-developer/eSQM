## Overview



## Configure Monday App

1. Open monday.com, login to your account and go to a "Developers" section.
2. Create a new "QuickStart View Example App"
3. Open "OAuth & Permissions" section and add "boards:read" scope
4. Open "Features" section and create a new "Boards View" feature
5. Open "View setup" tab and fulfill in "Custom URL" field your monday tunnel public URL, which you got previously (example: https://unsightly-chickaree-35.tunnel.monday.app)
6. Click "Boards" button and choose one of the boards with some data in it.
7. Click "Preview button"
8. Enjoy the Quickstart View Example app!

## Release your app
1. Run script
### `yarn build`
2. Upload ZIP of that
3. `cd integration`
4. get the push URL for the current app version,
5. run `mapps:code push`


## Management API
There are several management commands which can be run with https://www.usebruno.com. The folder `bruno_collection` contains the definitions.

The management API requires a `management_key` which is set in the environment variables for each environment on monday code. This needs to be added to the "environment" you're using in bruno, along with setting the base URL to the correct monday code endpoint.
