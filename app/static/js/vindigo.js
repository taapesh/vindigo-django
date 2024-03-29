'use strict';

$(window).load(function() {
    $('.fullscreen-element').each(function() {
        $(this).css('height', $(window).height());
    });

    $(window).resize(function() {
        $('.fullscreen-element').each(function() {
            $(this).css('height', $(window).height());
        });
    });
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

// Vindigo API
const vindigoApiBase = "https://morning-ocean-87068.herokuapp.com/";
const getDevicesBase = vindigoApiBase + "devices/all";
const createDeviceBase = vindigoApiBase + "devices/create_device";
const logTripBase = vindigoApiBase + "trips/log_trip";

const TRIP_START = 1;
const TRIP_END = 2;
const GEO_ENTER = 3;
const GEO_EXIT = 4;

var vindigoMainPanel;
var vindigoTripForm;
var vindigoEvents;
var geofenceForm;
var addGeofenceBtn;
var geofenceCenterAddress;
var geofenceRadius;
var geoEnterMsg;
var geoExitMsg;
var geofenceList;
var tripStats;

var deviceSelect;

var map;

$(function() {
    /**
    * Initialize Mapbox
    */
    map = L.mapbox.map('map', 'mapbox.streets', { zoomControl: false }) 
    .setView([32.78194730000001, -96.79070819999998], 17);

    map.doubleClickZoom.disable();
    map.scrollWheelZoom.disable();

    $('#addGeofenceBtn').opentip("Add Geofence", {
        showOn: "mouseover",
        fixed: true,
        showEffectDuration: 0.05,
        hideEffectDuration: 0.1,
        tipJoint: "bottom", 
        target: true
    });

    $("#addGeofenceBtn").click(function(){
        $("#myModal").modal();
    });

    vindigoMainPanel = $('#vindigoMainPanel');
    vindigoTripForm = $('#vindigoTripForm');
    vindigoEvents = $('#vindigoEvents');
    geofenceForm = $('#geofenceForm');
    addGeofenceBtn = $('#addGeofenceBtn');
    geofenceCenterAddress = $('#geofenceCenter');
    geofenceRadius = $('#geofenceRadius');
    geoEnterMsg = $('#geofenceEnterMsg');
    geoExitMsg = $('#geofenceExitMsg');
    geofenceList = $('#geofenceList');
    tripStats = $('#tripStats');
    deviceSelect = $('#deviceSelect');

    $('#map').height($(window).height());

    tripStats.hide();

    $.ajax({
        type: 'GET',
        url: getDevicesBase,

        success: function(data) {
            var listItems = '';
            for (var i = 0; i < data.length; i++) {
                listItems += "<option value='" + i + "'>" + data[i].device_id + "</option>";
            }
            deviceSelect.append(listItems);
        },

        error: function() {
            console.log('error');
        }
    });
});

// Set mapbox access token
L.mapbox.accessToken = accessToken;

var trip;
var geofences = [];

/**
 * Save a trip stats under a device
 */
 function logTrip(startLat, startLng, endLat, endLng, duration, distance) {
    var deviceId = $('#deviceSelect :selected').text();

    $.ajax({
        type: 'POST',
        url: 'http://morning-ocean-87068.herokuapp.com/trips/log_trip',
        data: {
            'device_id': deviceId,
            'start_lat': startLat,
            'start_lng': startLng,
            'end_lat': endLat,
            'end_lng': endLng,
            'duration': duration,
            'distance': distance,
            'status': 'completed'
        },
        success: function (response) {
            console.log(response);
        },
        error: function () {
            console.log("failed to save trip");
        }
    });
}

/**
 * For quick testing using sample trip
 */
function testGetCoords() {
    var device = deviceSelect.val()

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

        logTrip(startLat, startLng, endLat, endLng, duration, distance);
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

    $( "#vindigoHeader" ).slideToggle( "slow", function() {
        // Animation complete.
    });
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
    var address = $('#geofenceCenter').val().replace(' ', '+');
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

    var div = $('<div class="vindigo-event">' +
        '<i class="fa ' + iconClass + ' event-icon"></i>' + 
        '<div class="event-header">' + header + '</div>' + 
        '<div class="event-message">' + message + '</div>' +
        '</div>');
    div.hide();
    vindigoEvents.append(div);
    div.slideToggle();
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

}

function cancelAddGeofence() {
    addGeofenceBtn.show();
}