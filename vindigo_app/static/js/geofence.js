var Geofence = function (center, radius) {
    this.enterMessage = 'You entered the geofence';
    this.exitMessage = 'You left the geofence';
    this.center = center;
    this.radius = radius;
    this.inside = false;
};

Geofence.prototype.getLatLng = function() {
    console.log("Geofence center " + this.center);
    return [this.center[0], this.center[1]];
};

Geofence.prototype.getCenterLat = function() {
    return this.center[0];
};

Geofence.prototype.getCenterLng = function() {
    return this.center[1];
};

Geofence.prototype.getRadius = function() {
    return this.radius;
}

Geofence.prototype.onEnter = function() {
    this.inside = true;
}

Geofence.prototype.onExit = function() {
    this.inside = false;
}