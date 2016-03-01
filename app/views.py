from django.shortcuts import render

def home(request):
    return render(request, "home.html", {})

def devices(request):
    return render(request, "devices.html", {})
