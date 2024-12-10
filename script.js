mapboxgl.accessToken = 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

// Initialize the map
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/outdoors-v12',
    center: [133.7751, -25.2744], // Centered on Australia
    zoom: 3
});

// Add navigation controls
map.addControl(new mapboxgl.NavigationControl());

let cityCoordinatesMap = {};  // Store city coordinates
let countryFlagMap = {}; // Store country to flag mapping
let countryCodeMap = {}; // Store country name to country code mapping

// Function to render sidebar structure for multiple networks
function renderSidebarStructure(routing) {
    const ul = document.createElement('ul');

    for (const [city, node] of Object.entries(routing)) {
        const li = document.createElement('li');
        li.textContent = `${city} (${node.type})`;

        if (node.connections && typeof node.connections === 'object' && Object.keys(node.connections).length > 0) {
            const childList = renderSidebarStructure(node.connections);
            li.appendChild(childList);
        }

        ul.appendChild(li);
    }

    return ul;
}

// ** Render Sidebar with Country, City, and Flag **
function buildNodeList(nodes) {
    const ul = document.createElement('ul');

    for (const [nodeName, nodeData] of Object.entries(nodes)) {
        const li = document.createElement('li');
        
        const cityName = capitalizeCityName(nodeName);
        
        // Get country name from the geojson data based on city
        const countryName = cityCountryMap[nodeName.toLowerCase()] ? cityCountryMap[nodeName.toLowerCase()] : 'Unknown';
        
        // Country flag logic using country-code from geojson
        const countryCode = cityCountryMap[nodeName.toLowerCase()] ? cityCountryMap[nodeName.toLowerCase()] : null;
        const flagImgPath = countryCode ? `flags/${countryCode.toLowerCase()}.svg` : null;
        
        // Only show city and country name, not the country code
        li.innerHTML = `<strong>(${nodeData.type})</strong> ${cityName}`;
        
        if (flagImgPath) {
            const flagImg = document.createElement('img');
            flagImg.src = flagImgPath;
            flagImg.alt = `${countryName} flag`;
            flagImg.style.width = '20px';
            flagImg.style.marginLeft = '5px';
            li.appendChild(flagImg);
        } else {
            console.warn(`Flag not found for ${countryName}`);
        }

        // Add child nodes if they exist
        if (nodeData.connections && Object.keys(nodeData.connections).length > 0) {
            const childNodes = buildNodeList(nodeData.connections);
            li.appendChild(childNodes);
        }

        ul.appendChild(li);
    }

    return ul;
}

// Add route to sidebar
function addRouteToSidebar(networkName, jobName, color, routing) {
    const containerId = networkName === 'NET1' ? 'sidebar' : 'sidebar2';
    const routesContainer = document.getElementById(containerId);

    const routeElement = document.createElement('div');
    routeElement.classList.add('route');
    routeElement.style.border = `2px solid ${color}`;
    routeElement.style.marginBottom = '10px';

    const titleElement = document.createElement('h3');
    titleElement.textContent = jobName;
    titleElement.style.color = color;
    titleElement.style.cursor = 'pointer';
    
    // Dynamically set the background color for hover and active events using the custom property
    titleElement.style.setProperty('--route-background', color);

    routeElement.appendChild(titleElement);

    const nodeList = document.createElement('ul');

    titleElement.addEventListener('click', () => {
        nodeList.classList.toggle('open'); // Toggle the open class for smooth expansion
        routeElement.classList.toggle('open'); // Toggle the open class for smooth expansion
    });

    const nodes = buildNodeList(routing);
    nodeList.appendChild(nodes);
    routeElement.appendChild(nodeList);
    routesContainer.appendChild(routeElement);
}



// Function to capitalize city name (first letter of each word)
function capitalizeCityName(city) {
    return city
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

// Function to extract paths from the main routing structure (both main chain and sub-nodes)
function extractPathsFromRouting(routing, cityCoordinatesMap) {
    let paths = [];
    let prevCity = null;

    for (const [city, node] of Object.entries(routing)) {
        const currentCityCoords = cityCoordinatesMap[city.toLowerCase()];
        if (!currentCityCoords) {
            console.error(`City coordinates not found for ${city}`);
            continue;
        }

        if (prevCity) {
            const prevCityCoords = cityCoordinatesMap[prevCity.toLowerCase()];
            if (prevCityCoords) {
                paths.push([prevCityCoords, currentCityCoords]);
            }
        }
        prevCity = city;

        if (node.connections) {
            for (const [subNode, subNodeData] of Object.entries(node.connections)) {
                const subNodeCoords = cityCoordinatesMap[subNode.toLowerCase()];
                if (subNodeCoords) {
                    paths.push([currentCityCoords, subNodeCoords]);
                    const subPaths = extractPathsFromRouting({ [subNode]: subNodeData }, cityCoordinatesMap);
                    paths = paths.concat(subPaths);
                }
            }
        }
    }

    return paths;
}

// Function to add route to the map for all networks
function addRouteToMap(routeName, colour, routePaths) {
    if (!colour || typeof colour !== 'string') {
        console.error('Invalid colour:', colour);
        return;
    }

    const features = routePaths.map(([fromCoords, toCoords]) => ({
        type: 'Feature',
        geometry: {
            type: 'LineString',
            coordinates: [fromCoords, toCoords]
        }
    }));

    map.addSource(routeName, {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: features
        }
    });

    map.addLayer({
        id: `${routeName}-route-layer`,
        type: 'line',
        source: routeName,
        paint: {
            'line-color': colour,
            'line-width': 4
        }
    });

    map.addSource(`${routeName}-animated`, {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: features
        }
    });

    map.addLayer({
        id: `${routeName}-animated-route-layer`,
        type: 'line',
        source: `${routeName}-animated`,
        paint: {
            'line-color': 'black',
            'line-width': 4,
            'line-opacity': 0.08,
            'line-dasharray': [0, 0.5, 0.5]
        }
    });

    animateDashArray(`${routeName}-animated-route-layer`, routePaths);
}

// Function to animate the dash array for animated path
function animateDashArray(layerId) {
    const dashArraySequence = [
        [0, 4, 3],
        [0.5, 4, 2.5],
        [1, 4, 2],
        [1.5, 4, 1.5],
        [2, 4, 1],
        [2.5, 4, 0.5],
        [3, 4, 0]
    ];

    let step = 0;

    function animate(timestamp) {
        const newStep = parseInt((timestamp / 50) % dashArraySequence.length);
        if (newStep !== step) {
            map.setPaintProperty(layerId, 'line-dasharray', dashArraySequence[newStep]);
            step = newStep;
        }
        requestAnimationFrame(animate);
    }

    animate(0);
}

// Function to calculate a 150km radius circle around a city (as a rough approximation)
function calculateCircle(lon, lat, radiusInKm) {
    const points = [];
    const earthRadius = 6371; // Radius of Earth in kilometers
    const numberOfPoints = 36; // Number of points to form a circle

    for (let i = 0; i < numberOfPoints; i++) {
        const angle = (i / numberOfPoints) * (Math.PI * 2); // Full circle in radians
        const latOffset = (radiusInKm / earthRadius) * (180 / Math.PI); // Latitude offset
        const lonOffset = (radiusInKm / earthRadius) * (180 / Math.PI) / Math.cos(lat * Math.PI / 180); // Longitude offset

        const pointLat = lat + latOffset * Math.sin(angle);
        const pointLon = lon + lonOffset * Math.cos(angle);

        points.push([pointLon, pointLat]);
    }

    return points;
}

fetch('network.json')
    .then(response => response.json())
    .then(networks => {
        networks.forEach(networkData => {
            const { network_name, job_name, routing, color } = networkData;

            fetch('infra-locations.geo.json')
                .then(response => response.json())
                .then(data => {
                    cityCoordinatesMap = {};
                    cityCountryMap = {}; // Mapping city to country
                    countryFlagMap = {}; // Store flags using country code
                    
                    data.features.forEach(city => {
                        const cityName = city.properties.name.toLowerCase();
                        const countryCode = city.properties['country-code'] ? city.properties['country-code'].toLowerCase() : null;

                        cityCoordinatesMap[cityName] = city.geometry.coordinates;
                        cityCountryMap[cityName] = city.properties['country-code'] || 'Unknown';

                        if (countryCode) {
                            countryFlagMap[cityName] = `flags/${countryCode}.svg`;
                        } else {
                            console.warn(`Country code not found for ${cityName}`);
                        }
                    });

                    const routePaths = extractPathsFromRouting(routing, cityCoordinatesMap);
                    if (routePaths.length > 0) {
                        addRouteToMap(`${network_name}-${job_name}`, color, routePaths);
                    }

                    addRouteToSidebar(network_name, job_name, color, routing);
                })
                .catch(error => console.error('Error loading city coordinates:', error));
        });
    })
    .catch(error => console.error('Error loading network data:', error));
