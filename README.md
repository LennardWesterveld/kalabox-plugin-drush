# Kalabox Plugin Drush

A nice drush plugin you can add to your app so you can do lots of fun drush things.

## Installation

You can install this plugin by going into your app directory and running the normal

```
npm install kalabox-plugin-drush --save
```

In order for your app to use the plugin you will also need to info the app of its existence. This can be done in the `kalabox.json` file in your
app root. Just add the plyugin name to the `appPlugins` key.

```json
{
  "appName": "pressflow7",
  "appPlugins": [
    "kalabox-plugin-pressflow7-env",
    "kalabox-plugin-util",
    "kalabox-plugin-drush"
  ],
  "appComponents": {
    "data": {
      "image": {
        "name": "kalabox/data:stable"
      }
    },
    "db": {
      "image": {
        "name": "kalabox/mariadb",
        "build": true,
        "src": "dockerfiles/kalabox/mariadb"
      }
    },
    "php": {
      "image": {
        "name": "pressflow7/php-fpm",
        "build": true,
        "src": "dockerfiles/pressflow7/php-fpm"
      }
    },
    "web": {
      "image": {
        "name": "pressflow7/nginx",
        "build": true,
        "src": "dockerfiles/pressflow7/nginx"
      },
      "proxy": [
        {
          "port": "80/tcp",
          "default": true
        }
      ]
    }
  }
}

```

## Other Resources

* [API docs](http://api.kalabox.me/)
* [Test coverage reports](http://coverage.kalabox.me/)
* [Kalabox CI dash](http://ci.kalabox.me/)
* [Mountain climbing advice](https://www.youtube.com/watch?v=tkBVDh7my9Q)
* [Boot2Docker](https://github.com/boot2docker/boot2docker)
* [Syncthing](https://github.com/syncthing/syncthing)
* [Docker](https://github.com/docker/docker)

-------------------------------------------------------------------------------------
(C) 2015 Kalamuna and friends


