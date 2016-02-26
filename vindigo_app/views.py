from django.shortcuts import render

devices_base = "https://morning-ocean-87068.herokuapp.com/devices/all"

def home(request):
    return render(request, "home.html", {})

def devices(request):
    return render(request, "devices.html", {})
