'use strict';

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

// Vindigo API
const vindigoApiBase = "https://morning-ocean-87068.herokuapp.com/";
const getDevicesBase = vindigoApiBase + "devices/all";
const createDeviceBase = vindigoApiBase + "devices/create_device";

const TRIP_START = 1;
const TRIP_END = 2;
const GEO_ENTER = 3;
const GEO_EXIT = 4;

var vindigoMainPanel;
var vindigoTripForm;
var vindigoEvents;
var geofenceForm;
var addGeofenceBtn;
var geofenceInput;
var geofenceCenterAddress;
var geofenceRadius;
var geoEnterMsg;
var geoExitMsg;
var geofenceList;
var tripStats;

var deviceSelect;

$(function() {
    vindigoMainPanel = $('#vindigoMainPanel');
    vindigoTripForm = $('#vindigoTripForm');
    vindigoEvents = $('#vindigoEvents');
    geofenceForm = $('#geofenceForm');
    addGeofenceBtn = $('#addGeofenceBtn');
    geofenceInput = $('#geofenceInput');
    geofenceCenterAddress = $('#geofenceCenter');
    geofenceRadius = $('#geofenceRadius');
    geoEnterMsg = $('#geofenceEnterMsg');
    geoExitMsg = $('#geofenceExitMsg');
    geofenceList = $('#geofenceList');
    tripStats = $('#tripStats');
    deviceSelect = $('#deviceSelect');

    $('#map').height($(window).height());

    geofenceInput.hide();
    tripStats.hide();

    $.ajax({
        // The 'type' property sets the HTTP method.
        // A value of 'PUT' or 'DELETE' will trigger a preflight request.
        type: 'GET',
        dataType: 'jsonp',

        // The URL to make the request to.
        url: getDevicesBase,

        // The 'contentType' property sets the 'Content-Type' header.
        // The JQuery default for this property is
        // 'application/x-www-form-urlencoded; charset=UTF-8', which does not trigger
        // a preflight. If you set this value to anything other than
        // application/x-www-form-urlencoded, multipart/form-data, or text/plain,
        // you will trigger a preflight request.
        // contentType: 'text/plain',

        xhrFields: {
            // The 'xhrFields' property sets additional fields on the XMLHttpRequest.
            // This can be used to set the 'withCredentials' property.
            // Set the value to 'true' if you'd like to pass cookies to the server.
            // If this is enabled, your server must respond with the header
            // 'Access-Control-Allow-Credentials: true'.
            withCredentials: false
        },

        headers: {
            // Set any custom headers here.
            // If you set any non-simple headers, your server must include these
            // headers in the 'Access-Control-Allow-Headers' response header.
            'Access-Control-Allow-Origin': '*'
        },

        success: function() {
            // Here's where you handle a successful response.
            console.log('success');
        },

        error: function() {
            // Here's where you handle an error response.
            // Note that if the error was due to a CORS issue,
            // this function will still fire, but there won't be any additional
            // information about the error.
            console.log('error');
        }
    });
});

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
var geofences = [];

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
        drawRoute(startLat, startLng, endLat, endLng);
        createGeofence(start, 150, "Arriving at work", "Leaving work");
        createGeofence(end, 150, "Arriving home", "Leaving home");
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
                    'marker-color': '#1F3A93',             
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
                    'marker-color': '#1F3A93',   
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
    map.fitBounds(featureLayer.getBounds().pad(0.5));
    

    var query = baseDirections + getLatLngString(startLat, startLng, endLat, endLng) + json + requestToken;
    
    $.getJSON(query, function(data) {
        var lineStyle = {
            'color': '#1FBAD6',
            'weight': 5,
            'opacity': 0.60
        };

        var geojson = data.routes[0].geometry;
        L.geoJson(geojson, { style: lineStyle }).addTo(map);

        // Extract duration in seconds
        // Extract distance in meters
        var distance = data.routes[0].distance;
        var duration = data.routes[0].duration;

        var distanceStr = formatDistance(distance);
        var durationStr = formatDuration(duration);

        $('#tripDistance').html("<b>DISTANCE:</b>  " + distanceStr);
        $('#tripDuration').html("<b>DURATION:</b>  " + durationStr);
        tripStats.show();

        vindigoTripForm.hide();
        geofenceForm.hide();
        simulateDrive(startLat, startLng, geojson, duration);
    });
}

/**
 * Simulate a vehicle driving along the route
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

    addVindigoEvent('Trip Started', 'Sit back and enjoy the ride!', TRIP_START);

    track();
}

/**
 * Track a trip in progress
 */
function track() {
    if (!trip.isEnded()) {
        var coords = trip.getLatLng();
        var lat = coords.lat;
        var lng = coords.lng;

        var numFences = geofences.length;
        for (var i = 0; i < numFences; i++) {
            var geofence = geofences[i];
            var geofenceLat = geofence.getCenterLat();
            var geofenceLng = geofence.getCenterLng();
            var distance = distanceBetween([geofenceLat, geofenceLng], [lat, lng]);
            var radius = geofence.getRadius();

            if (distance > radius && geofence.inside) {
                geofence.onExit();
                addVindigoEvent('Exiting Geofence', geofence.exitMessage, GEO_EXIT);
            } else if (distance <= radius && !geofence.inside) {
                geofence.onEnter();
                addVindigoEvent('Entering Geofence', geofence.enterMessage, GEO_ENTER);
            }
        }
        window.setTimeout(track, 1000);
    } else {
        addVindigoEvent('Arrived', 'You have arrived at your destination', TRIP_END);
    }
}

/**
 * Compute linear distance between two LatLng points
 * Haversine formula
 */
function distanceBetween(pointA, pointB) {
    var lat2 = pointB[0]; 
    var lon2 = pointB[1]; 
    var lat1 = pointA[0]; 
    var lon1 = pointA[1];

    var R = 6371000; // metres
    var dLat = toRad(lat2 - lat1);
    var dLng = toRad(lon2 - lon1);

    var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng/2) * Math.sin(dLng/2);

    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    var d = R * c; 
    return d;
}

function toRad(x) {
    return x * Math.PI / 180;
}

function readGeofenceInput() {
    var address = geofenceCenterAddress.val().replace(' ', '+');
    var radius = geofenceRadius.val();
    var enterMsg = geoEnterMsg.val();
    var exitMsg = geoExitMsg.val();
    createGeofence(address, radius, enterMsg, exitMsg);
}

/**
 * Draw a geofence on map
 */
function createGeofence(address, radius, enterMsg, exitMsg) {
    var query = baseGeocoding + address + json + requestToken;

    $.getJSON(query, function( data ) {
        var center = data.features[0].center;
        var centerLat = center[0];
        var centerLng = center[1];

        var circleOptions = {
            color: '#1F3A93',     // Stroke color
            opacity: .8,          // Stroke opacity
            weight: 1.5,            // Stroke weight
            fillColor: '#1F3A93', // Fill color
            fillOpacity: 0.1      // Fill opacity
        };


        var featureLayer = L.mapbox.featureLayer().addTo(map);
        var geofenceCircle = L.circle([centerLng, centerLat], radius, circleOptions).addTo(featureLayer);
        map.fitBounds(geofenceCircle.getBounds().pad(0.5));
        var fence = new Geofence([centerLng, centerLat], radius, enterMsg, exitMsg);
        geofences.push(fence);
        geofenceInput.hide();
        addGeofenceBtn.show();
        $('html, body').animate({ scrollTop: 0 }, 'fast');

        addGeofenceCard('' + centerLng + ', ' + centerLat, '' + radius, enterMsg, exitMsg);
    });
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

function addVindigoEvent(header, message, type) {
    var iconClass = "";

    switch(type) {
        case TRIP_START:
            iconClass = "fa-car event-start";
            break;
        case TRIP_END:
            iconClass = "fa-flag event-end";
            break;
        case GEO_ENTER:
            iconClass = "fa-dot-circle-o event-enter";
            break;
        case GEO_EXIT:
            iconClass = "fa-times-circle-o event-exit";
            break;
        default:
            iconClass = "";
            break;
    }

    vindigoEvents.append($(
        '<div class="vindigo-event">' +
        '<i class="fa ' + iconClass + ' event-icon"></i>' + 
        '<div class="event-header">' + header + '</div>' + 
        '<div class="event-message">' + message + '</div>' +
        '</div>'));
}

function addGeofenceCard(center, radius, header, message) {
    geofenceList.append($(
    '<div class="geofence-card">' + 
    'Geofence<br>' + 
    'Location: ' + center + '</br>' + 
    'Radius: ' + radius + ' meters' + 
    '</div>'));
}

function showGeofenceForm() {
    addGeofenceBtn.hide();
    geofenceInput.show();
}

function cancelAddGeofence() {
    addGeofenceBtn.show();
    geofenceInput.hide();
}