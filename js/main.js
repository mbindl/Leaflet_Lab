//function to instantiate the Leaflet map
function createMap(){
    //create the map
    var map = L.map('map', {
        center: [15, 110],
        zoom: 3
    });

    //add base tilelayer
    L.tileLayer('https://api.mapbox.com/styles/v1/mtbindl/cjpm66f7x1kf32spdpfdyyxs3/tiles/256/{z}/{x}/{y}@2x?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery   <a href="http://mapbox.com">Mapbox</a>',
    maxZoom: 18,
    id: 'mapbox.streets',
    accessToken: 'pk.eyJ1IjoibXRiaW5kbCIsImEiOiJjanMzcXljcXEwNHJkNDlwZno3dWo5a2UxIn0.qynnCUslq3GOpWprfjfDrg'
    }).addTo(map);

    //call getData function
    getData(map);
};
//Resize proportional symbols according to new attribute values
function updatePropSymbols(map, attribute){
    map.eachLayer(function(layer){
        //
        if (layer.feature && layer.feature.properties[attribute]){
            //access feature properties
            var props = layer.feature.properties;

            //update each feature's radius based on new attribute values
            var radius = calcPropRadius(props[attribute]);
            layer.setRadius(radius);

            //add city to popup content string
            var popupContent = "<p><b>City:</b> " + props.City + "</p>";

            //add formatted attribute to panel content string
            var year = attribute.split("_")[1];
            popupContent += "<p><b>Population in " + year + ":</b> " + props[attribute] + " million</p>";

            //replace the layer popup
            layer.bindPopup(popupContent, {
                offset: new L.Point(0,-radius)
            });
        };
    });
};
//Build an attributes array from the data
function processData(data){
    //empty array to hold attributes
    var attributes = [];

    //properties of the first feature in the dataset
    var properties = data.features[0].properties;

    //push each attribute name into attributes array
    for (var attribute in properties){
        //only take attributes with population values
        if (attribute.indexOf("Pop") > -1){
            attributes.push(attribute);
        };
    };
    return attributes;
};


// Create new sequence controls
function createSequenceControls(map, attributes){
    //create range input element (slider)
    $('#panel').append('<input class="range-slider" type="range">');

    // Add skip buttons
    $('#panel').append('<button class="skip" id="reverse"></button>');
    $('#panel').append('<button class="skip" id="forward"></button>');
    // replace button content with images
    $('#reverse').html('<img src="img/reverse.png">');
    $('#forward').html('<img src="img/forward.png">');
    
    // set slider attributes
    $('.range-slider').attr({
        max: 6,
        min: 0,
        value: 0,
        step: 1
    
    });

    //Click listener for buttons
    $('.skip').click(function(){
        //get the old index value
        var index = $('.range-slider').val();

        //Increment or decrement depending on button clicked
        if ($(this).attr('id') == 'forward'){
            index++;
            //If past the last attribute, wrap around to first attribute
            index = index > 6 ? 0 : index;
        } else if ($(this).attr('id') == 'reverse'){
            index--;
            //If past the first attribute, wrap around to last attribute
            index = index < 0 ? 6 : index;
        };

        //Update slider
        $('.range-slider').val(index);
        updatePropSymbols(map, attributes[index]);
    });
    //input listener for slider
    $('.range-slider').on('input', function(){
        //Get the new index value
        var index = $(this).val();
        updatePropSymbols(map, attributes[index]);
    });
};
//calculate the radius of each proportional symbol
function calcPropRadius(attValue) {
    //scale factor to adjust symbol size evenly
    var scaleFactor = 50;
    //area based on attribute value and scale factor
    var area = attValue * scaleFactor;
    //radius calculated based on area
    var radius = Math.sqrt(area/Math.PI);

    return radius;
};

function pointToLayer(feature, latlng, attributes){
    //Determine which attribute to visualize with proportional symbols
    var attribute = attributes[0];

    //create marker options
    var geojsonMarkerOptions = {
        fillColor: "#ff7800",
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
    };

    //For each feature, determine its value for the selected attribute
    var attValue = Number(feature.properties[attribute]);

    //Give each feature's circle marker a radius based on its attribute value
    geojsonMarkerOptions.radius = calcPropRadius(attValue);

    //create circle marker layer
    var layer = L.circleMarker(latlng, geojsonMarkerOptions);

    //build popup content string
    var popupContent = "<p><b>City:</b> " + feature.properties.City + "</p>";

    //add formatted attribute to popup content string
    var year = attribute.split("_")[1];
    popupContent += "<p><b>Population in " + year + ":</b> " + feature.properties[attribute] + " million</p>";
    
    //bind the popup to the circle marker
    layer.bindPopup(popupContent, {
        offset: new L.Point(0,-geojsonMarkerOptions.radius)
    });
    
    //event listeners to open popup on hover
    layer.on({
        mouseover: function(){
            this.openPopup();
        },
        mouseout: function(){
            this.closePopup();
        },
         click: function(){
             $("#panel").html(popupContent);
        }
    });
    //return the circle marker to the L.geoJson pointToLayer option
    return layer;
};

// Add circle markers for point features to the map
function createPropSymbols(data, map, attributes){
    //create a Leaflet GeoJSON layer and add it to the map
    L.geoJson(data, {
        pointToLayer: function(feature, latlng){
            return pointToLayer(feature, latlng, attributes);
        }
    }).addTo(map);
};

//function to retrieve the data and place it on the map
function getData(map){
    $.ajax("data/MegaCities.geojson", {
        dataType: "json",
        success: function(response){
           
           //create an attributes array
            var attributes = processData(response);
            createPropSymbols(response, map, attributes);
            createSequenceControls(map, attributes)
        }
    });
};
$(document).ready(createMap);