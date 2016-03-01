const vindigoApiBase = "https://morning-ocean-87068.herokuapp.com/";
const getDevicesBase = vindigoApiBase + "devices/all";

$(function() {
    var devicesDiv = $('#devices');

    $.ajax({
        type: 'GET',
        url: getDevicesBase,

        success: function(data) {
            console.log("success");

            for (var i = 0; i < data.length; i++) {
                var lat = data[i].location_lat;
                var lng = data[i].location_lng;

                if (lat == null) {
                    lat = -96.7907082;
                    lng = 32.7819473;
                }

                devicesDiv.append(
                    '<div class="device-box">' + 
                    '<h1>' + data[i].device_name + '</h1>' + 
                    '<h2>' + data[i].device_id + '</h2>' +
                    '<h3>' + '<b>Location:</b> ' + lng + ', ' + lat + '</h3>' + 
                    '<h3>' + '<b>Distance Driven:</b> ' + data[i].distance_driven + ' m' + '</h3>' + 
                    '<h3>' + '<b>Time Driven:</b> ' + data[i].time_driven + ' seconds' + '</h3>' + 
                    '</div>');
            }
        },

        error: function() {
            console.log('error');
        }
    });
});

