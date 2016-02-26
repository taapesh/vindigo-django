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
                    lat = 32.7819473;
                    lng = -96.7907082;
                }

                devicesDiv.append(
                    '<div class="device-box">' + 
                    '<h3>' + data[i].device_name + '</h3>' + '<br>' + 
                    data[i].device_id + '<br><br>' +
                    '<b>Location:</b> ' + lat + ', ' + lng + '<br>' + 
                    '<b>Distance Driven:</b> ' + data[i].distance_driven + ' m' + '<br>' + 
                    '<b>Time Driven:</b> ' + data[i].time_driven + ' seconds' + '<br>' + 
                    '</div>');
            }
        },

        error: function() {
            console.log('error');
        }
    });
});

