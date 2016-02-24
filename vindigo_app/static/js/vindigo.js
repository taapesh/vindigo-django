'use strict';

var statsHeader;

$(function() {
    statsHeader = $('#statsHeader');
    statsHeader.hide();
});

// Constants
const METERS_IN_MILE = 1609.34;
const MILES_CUTOFF = METERS_IN_MILE / 10;

// Mapbox API
const accessToken = 'pk.eyJ1IjoidGFhcGVzaCIsImEiOiJjaWt4eW9iNXgwMHo4dnltM2x4eTJ4eHE3In0.04-WgulwzLNQTZLRinDiJw';
const apiBase = 'https://api.mapbox.com/';
const baseGeocoding = apiBase + 'geocoding/v5/mapbox.places/';
const baseDirections = apiBase + 'v4/directions/mapbox.driving/';
const json = '.json';
const requestToken = '?access_token=' + accessToken;

// Set mapbox access token
L.mapbox.accessToken = accessToken;

/**
 * Initialize Mapbox
 */
var map = L.mapbox.map('map', 'mapbox.streets', {zoomControl: false}) 
    .setView([32.78194730000001, -96.79070819999998], 17);

map.doubleClickZoom.disable();
map.scrollWheelZoom.disable();

var trip;

/**
 * For quick testing using sample trip
 */
function testGetCoords() {
    var start = '2203+Commerce+St,+Dallas,+TX';
    var end = '2901+Indiana+St.+Dallas,+TX';

    var queryStart = baseGeocoding + start + json + requestToken;
    var queryEnd = baseGeocoding + end + json + requestToken;

    var startLat;
    var startLng;
    var endLat;
    var endLng;

    $.when(
        $.getJSON(queryStart, function( data ) {
            startLat = data.features[0].center[0];
            startLng = data.features[0].center[1];
        }),

        $.getJSON(queryEnd, function( data ) {
            endLat = data.features[0].center[0];
            endLng = data.features[0].center[1];
        }))
    .then(function() {
        //addMarkers(startLat, startLng, endLat, endLng);
        drawRoute(startLat, startLng, endLat, endLng);
    });
}

/**
 * Convert text location of start/end to LatLng coordinates and start trip
 */
function getCoords() {
    var start = $('#start').val();  // 2203 Commerce St, Dallas, TX 75201
    var end = $('#end').val();      // 2901 Indiana St., Dallas, TX

    if (start.length == 0 || end.length == 0) {
        // TODO: Display input error
        return;
    }

    var queryStart = baseGeocoding + start.replace(' ', '+') + json + requestToken;
    var queryEnd = baseGeocoding + end.replace(' ', '+') + json + requestToken;

    var startLat;
    var startLng;
    var endLat;
    var endLng;

    $.when(
        $.getJSON(queryStart, function( data ) {
            startLat = data.features[0].center[0];
            startLng = data.features[0].center[1];
        }),

        $.getJSON(queryEnd, function( data ) {
            endLat = data.features[0].center[0];
            endLng = data.features[0].center[1];
        }))
    .then(function() {
        drawRoute(startLat, startLng, endLat, endLng);
    });
}

/**
 * Given two LatLng coordinates, compute the coordinates of the midpoint
 */
function getMidpoint(startLat, startLng, endLat, endLng) {
    /* degrees = radians * (180/pi)
     * radians = degrees * (pi/180)
     */
    var dLng = (endLng - startLng) * (Math.PI / 180);

    var lat1 = startLat * (Math.PI / 180);
    var lat2 = endLat * (Math.PI / 180);
    var lng1 = startLng * (Math.PI / 180);

    var bx = Math.cos(lat2) * Math.cos(dLng);
    var by = Math.cos(lat2) * Math.sin(dLng);
    
    var lat3 = 
        Math.atan2(Math.sin(lat1) + Math.sin(lat2), Math.sqrt((Math.cos(lat1) + bx) * (Math.cos(lat1) + bx) + by * by));
    var lng3 = lng1 + Math.atan2(by, Math.cos(lat1) + bx);

    return [lat3 * (180 / Math.PI), lng3 * (180 / Math.PI)];
}

/**
 * Add markers to map for start and destination
 */
function addMarkers(startLat, startLng, endLat, endLng) {
    var geoJson = {
        'type': 'FeatureCollection',

        'features': [{
            'type': 'Feature',
            'properties': {
                'title': 'Start',
                'description': '',
                'marker-size': 'large',
                'marker-symbol': 'circle',
                'marker-color': '#37459D'
            },
            'geometry': {
                'type': 'Point',
                'coordinates': [startLat, startLng]
            }
        }, {
            'type': 'Feature',
            'properties': {
                'title': 'End',
                'description': '',
                'marker-size': 'large',
                'marker-symbol': 'embassy',
                'marker-color': '#37459D'
            },
            'geometry': {
                'type': 'Point',
                'coordinates': [endLat, endLng]
            }
        }]
    };

    var featureLayer = L.mapbox.featureLayer().addTo(map);
    featureLayer.setGeoJSON(geoJson);
    map.fitBounds(featureLayer.getBounds());
}

/**
 * Draw a driving route on the map between two LatLng coordinates
 */
function drawRoute(startLat, startLng, endLat, endLng) {
    var markerGeoJson = {
        type: 'FeatureCollection',
        features: [
            {
                type: 'Feature',
                
                properties: {
                    'title': 'Start',
                    'description': '',
                    'marker-size': 'large',
                    'marker-symbol': 'star',
                    'marker-color': '#37459D',             
                },
                
                geometry: {
                    type: 'Point',
                    coordinates: [startLat, startLng]
                }
            },
            {
                type: 'Feature',
                
                properties: {
                    'title': 'End',
                    'description': '',
                    'marker-size': 'large',
                    'marker-symbol': 'embassy',
                    'marker-color': '#37459D',   
                },
                
                geometry: {
                    type: 'Point',
                    coordinates: [endLat, endLng]
                }
            }
        ]
    };

    var featureLayer = L.mapbox.featureLayer().addTo(map);
    featureLayer.setGeoJSON(markerGeoJson);
    map.fitBounds(featureLayer.getBounds());

    var query = baseDirections + getLatLngString(startLat, startLng, endLat, endLng) + json + requestToken;
    
    $.getJSON(query, function(data) {
        var lineStyle = {
            'color': '#1FBAD6',
            'weight': 5,
            'opacity': 0.65
        };

        var geojson = data.routes[0].geometry;
        L.geoJson(geojson, { style: lineStyle }).addTo(map);

        // Extract duration in seconds
        // Extract distance in meters
        var distance = data.routes[0].distance;
        var duration = data.routes[0].duration;

        var distanceStr = formatDistance(distance);
        var durationStr = formatDuration(duration);

        
        if (!statsHeader.is(':visible')) {
            statsHeader.show();
        }

        $('#tripDistance').html(distanceStr);
        $('#tripDuration').html(durationStr);

        simulateDrive(startLat, startLng, geojson, duration);
        drawGeofence(startLat, startLng, 200);
    });
}

/**
 * Simulate a car driving along the route
 */
function simulateDrive(startLat, startLng, geojson, duration) {
    var carIcon = L.icon({
        iconUrl: '/static/img/car.svg',
        iconSize: L.point(32, 32)
    });

    // Reverse lat lng for each coordinate
    var coords = geojson.coordinates;
    var numCoords = coords.length;
    for (var i = 0; i < numCoords; i++) {
        var tmp = coords[i][0];
        coords[i][0] = coords[i][1];
        coords[i][1] = tmp;
    }

    // Duration is in seconds; convert to milliseconds
    trip = L.Marker.movingMarker(coords,
                        duration*1000, {icon: carIcon}).addTo(map);
    trip.start();
    track();
}

function track() {
    console.log(trip.getLatLng());
    window.setTimeout(track, 1000);
}

/**
 * Draw a geofence on map
 */
function drawGeofence(centerLat, centerLng, radius) {
    var featureGroup = L.featureGroup().addTo(map)

    var circleOptions = {
      color: '#37459D',     // Stroke color
      opacity: .8,          // Stroke opacity
      weight: 2,            // Stroke weight
      fillColor: '#37459D', // Fill color
      fillOpacity: 0.1      // Fill opacity
    };

    var geofence = L.circle([centerLng, centerLat], radius, circleOptions).addTo(featureGroup);
}

/**
 * Format two coordinates into a request string for Mapbox api
 */
function getLatLngString(startLat, startLng, endLat, endLng) {
    return startLat + ',' + startLng + ';' + endLat + ',' + endLng;
}

/**
 * Get string representation of input distance (meters)
 */
function formatDistance(distance) {
    if (distance < MILES_CUTOFF) {
        return distance + ' ft';
    } else if (distance <= METERS_IN_MILE) {
        return (distance / METERS_IN_MILE).toFixed(2) + ' mile';
    } else {
        return (distance / METERS_IN_MILE).toFixed(2) + ' miles';
    }
}

/**
 * Get string representation of input duration (seconds)
 */
function formatDuration(duration) {
    if (duration > 3600) {
        var hours = Math.floor(duration / 3600);
        var remainingSeconds = duration % 3600;
        var minutes = Math.floor(remainingSeconds / 60);
        return hours + ' h ' + minutes + ' minutes';
    } else if (duration > 60) {
        var minutes = Math.floor(duration / 60);
        var remainingSeconds = duration % 60;
        return minutes + ' min ' + remainingSeconds + ' sec';
    } else {
        return duration + ' sec';
    }
}