![netmap](https://github.com/user-attachments/assets/9d8cc8e3-1212-4658-8ffb-4eca1bfd6128)

Following on from the DigitalRecon project, I thought it would be cool to be able to geographically display networks on a globe. You can use this for pretty much any network you like.

https://github.com/user-attachments/assets/c7ac01b9-d904-43c9-8b16-365982be2d76

# Usage
- Get a Mapbox API key and plug it into `script.js`
- Add network configuration in `network.json` (read note below)
- Run a HTTP server (I used `python3 -m http.server 80`)
- View it

## `infra-locations.geo.json` layout
**NOTE: I mapped all of the AWS, Azure, GCP, and Vultr node locations. Anything outside of these locations will need to be added in `infra-locations.geo.json`**

Format:
```json
{ "type": "Feature", "geometry": { "type": "Point", "coordinates": [-123.1207, 49.2827] }, "properties": { "name": "Vancouver", "country": "Canada", "country-code": "CA" } }
```

## `network.json` layout
- `network_name`: `NET1` and `NET2` will display it in one of the two sidebars (if you want to change this, also change it in `script.js` so it generates the sidebars properly)
- `job_name`: The name of the job (stack multiple jobs inside a single network)
- `routing`: These are your network routes
	- `type`: Use this to display the type of node or which provider it is using (you can change this to whatever you want, it will display in the sidebar)
	- `connections`: This allows you to use a node to branch into multiple routing legs (stack these as many times as you want)
- `color`: This is the color used for the lines on the map

```json
  {
    "network_name": "NET1",
    "job_name": "test",
    "routing": {
      "sydney": { "type": "AWS", "connections": [] },
      "melbourne": { "type": "AWS", "connections": [] },
      "auckland": { "type": "GCP", "connections": [] },
      "perth": { 
        "type": "Azure", 
        "connections": {
          "singapore": { 
            "type": "Azure", 
            "connections": {
              "jakarta": { "type": "Vultr" }, 
              "manila": { "type": "GCP" }
            }
          },
          "brisbane": { 
            "type": "Vultr", 
            "connections": { 
              "osaka": { "type": "AWS" },
              "tokyo": { "type": "GCP" }
            }
          }
        }
      }
    },
    "color": "#00FF00" 
  }
```

# Todo
- Add the ability to change animation based on whether the network is being used
- Add the ability to change color based on network degradation
- Add historic views (hide/view old networks)
- Add elevation to lines, similar to a flight path
