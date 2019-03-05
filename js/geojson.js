// Global Variables
// empty variable to update the map with
var currentMap = 0;
// Initialize global variables for use later
var currentLayer = 0; // holds geoJsonLayer for future modifications
var currentAttributes = 0; // Visitor attribute names
var currentFilter = 'all'; // current Filter selection, initially 'all'
var rawJson = 0; // holds ajax response, aka raw json data
var featureSelected = 0; // holds the currently selected park information
var currentAttribute = 0; // holds the currently selected visitor attribute name

//function to instantiate the Leaflet map
function createMap(){
    // bounding coordinates
    var southWest = L.latLng(38.5, -120.5),
    northEast = L.latLng(39.5, -119.5),
    bounds = L.latLngBounds(southWest, northEast);
    
    // basemaps
    var dayTraffic = L.tileLayer('https://api.mapbox.com/styles/v1/mtbindl/cjss5eg0a3s9s1fpc751iydsw/tiles/256/{z}/{x}/{y}@2x?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery   <a href="http://mapbox.com">Mapbox</a>', maxZoom: 18,
    id: 'mapbox.streets',
    accessToken: 'pk.eyJ1IjoibXRiaW5kbCIsImEiOiJjanMzcXljcXEwNHJkNDlwZno3dWo5a2UxIn0.qynnCUslq3GOpWprfjfDrg'
    })
    var nightTraffic = L.tileLayer('https://api.mapbox.com/styles/v1/mtbindl/cjss5fwla3rva1fqxc3ces51w/tiles/256/{z}/{x}/{y}@2x?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery   <a href="http://mapbox.com">Mapbox</a>',
    maxZoom: 18,
    id: 'mapbox.streets',
    accessToken: 'pk.eyJ1IjoibXRiaW5kbCIsImEiOiJjanMzcXljcXEwNHJkNDlwZno3dWo5a2UxIn0.qynnCUslq3GOpWprfjfDrg'
    })
    //create the map
    var map = L.map('map', {
        maxBounds: bounds,    
        center: [39.0968, -120.0324],
        zoom: 10,
        maxZoom: 19,
        minZoom: 8,
        layers: [dayTraffic]
    });



    var baseMaps = {
        "Light": dayTraffic,
        "Dark": nightTraffic
    };

    L.control.layers(baseMaps).addTo(map);
    
    currentMap = map
    
    //call getData function
    getData(map);
};
// create a number with commas
function numberWithCommas(x) {
    var parts = x.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
}

////Popup constructor function
//function Popup(properties, attribute, layer, radius){
//    this.properties = properties;
//    this.attribute = attribute;
//    this.layer = layer;
//    this.year = attribute.split("_")[1];
//    this.trips = numberWithCommas(this.properties[attribute]);
//    this.content = "<p><b># of vehicles \(daily average)\ in " + this.year + ":</b> " + this.trips + "</p>";
//    
//    this.bindToLayer = function(){
//        this.layer.bindPopup(this.content, {
//            offset: new L.Point(0,-radius)
//        });
//    };
//};


//Build an attributes array from the data
function processData(data){
    // Empty arrays to hold attributes
    var attributes = [];
    // Properties of the first feature in the dataset
    var properties = data.features[0].properties;
    // Push each attribute name into attributes array
    for (var attribute in properties){
        //catalog attributes with year values
        if (attribute.indexOf("yr") > -1){
            attributes.push(attribute)
        }
    };
    return [attributes];
};

// Create Legend
//function to create the legend
function createLegend(map, attributes){
    var LegendControl = L.Control.extend({
        options: {
            position: 'bottomright'
        },

        onAdd: function (map) {
            // create the control container with a particular class name
            var container = L.DomUtil.create('div', 'legend-control-container');

            //add temporal legend div to container
            $(container).append('<div id="temporal-legend">')

            //Start attribute legend svg string
            var svg = '<svg id="attribute-legend" width="160px" height="100px">';

            //Array of circle names to base loop on
            var circles = {
                max: 20,
                mean: 40,
                min: 60
            };

            //Loop to add each circle and text to svg string
            for (var circle in circles){
                //circle string
                svg += '<circle class="legend-circle" id="' + circle + '" fill="#006dad" fill-opacity="0.75" stroke="#000000" cx="30"/>';

                //text string
                svg += '<text id="' + circle + '-text" x="65" y="' + circles[circle] + '"></text>';

            };

            //close svg string
            svg += "</svg>";
            //add attribute legend svg to container
            $(container).append(svg);

            return container;
        }
    });

    map.addControl(new LegendControl());
};

//Calculate the max, mean, and min values for a given attribute
function getCircleValues(map, attribute){
    //start with min at highest possible and max at lowest possible number
    var min = Infinity,
        max = -Infinity;

    map.eachLayer(function(layer){
        //get the attribute value
        if (layer.feature){
            var attributeValue = Number(layer.feature.properties[attribute]);

            //test for min
            if (attributeValue < min){
                min = attributeValue;
            };

            //test for max
            if (attributeValue > max){
                max = attributeValue;
            };
        };
    });

    //set mean
    var mean = (max + min) / 2;
    //return values as an object
    return {
        max: max,
        mean: mean,
        min: min
    };
};

//Update the legend with new attribute
function updateLegend(map, attribute){
    //create content for legend
    var year = attribute.split("_")[1];
    var content = "Average Daily Vehicles " + year;

    //replace legend content
    $('#temporal-legend').html("<b>" + content + "</b>");

    //get the max, mean, and min values as an object
    var circleValues = getCircleValues(map, attribute);
    for (var key in circleValues){
      //get the radius
      var radius = calcPropRadius(circleValues[key], 0.075);

      //Assign the cy and r attributes
      $('#'+key).attr({
          cy: 59 - radius,
          r: radius
      });

      //Add legend text
      $('#'+key+'-text').text(numberWithCommas(circleValues[key].toFixed(0)) + " vehicles");
    };
};

// Create new sequence controls
function createSequenceControls(map, attributes){
    var SequenceControl = L.Control.extend({
        options: {
            position: 'bottomleft'
        },

        onAdd: function (map) {
            // create the control container div with a particular class name
            var container = L.DomUtil.create('div', 'sequence-control-container');

            // ... initialize other DOM elements, add listeners, etc.
            //create range input element (slider)
            $(container).append('<input class="range-slider" type="range">');

            //add skip buttons
            $(container).append('<button class="skip" id="reverse" title="Reverse">Reverse</button>');
            $(container).append('<button class="skip" id="forward" title="Forward">Skip</button>');
            //kill any mouse event listeners on the map
            $(container).on('mousedown dblclick', function(e){
                L.DomEvent.stopPropagation(e);
                L.DomEvent.disableClickPropagation(container);
            });
            
            return container;
        }
    });

    map.addControl(new SequenceControl());

    // replace button content with images
    $('#reverse').html('<img src="img/reverse.png">');
    $('#forward').html('<img src="img/forward.png">');
    
    // set slider attributes
    $('.range-slider').attr({
        max: 7,
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
            index = index > 7 ? 0 : index;
        } else if ($(this).attr('id') == 'reverse'){
            index--;
            //If past the first attribute, wrap around to last attribute
            index = index < 0 ? 7 : index;
        };

   // Update slider after arrow click
        $('.range-slider').val(index);
        
        // Rebuild layer as total values may have changed during time sequence
        currentMap.removeLayer(geoJsonLayer);
        geoJsonLayer = createPropSymbols(rawJson, currentMap, index, currentFilter);
        currentLayer = geoJsonLayer;
        currentMap.addLayer(geoJsonLayer);
        
        // Reset current attributes and update the info panel
        currentAttribute = currentAttributes[index];
        
        // Update legend title with new year
        $('#legendTitle').text("Visitors in " + currentAttribute.split("_")[1]);
        updateLegend(map, currentAttribute);
    });

    // Input listener for slider
    $('.range-slider').on('input', function(){
        // Get the new index value
        var index = $(this).val();
        
        // Rebuild layer as population values may have changed during time sequence
        currentMap.removeLayer(geoJsonLayer);
        geoJsonLayer = createPropSymbols(rawJson, currentMap, index, currentFilter);
        currentLayer = geoJsonLayer;
        currentMap.addLayer(geoJsonLayer);
        
        // Reset current attributes and update the info panel
        currentAttribute = attributes[index];
        updatePanel();
        
        // Update legend title with new year
        $('#legendTitle').text("Visitors in " + currentAttribute.split("_")[1]);
        updateLegend(map, currentAttribute);
    });
};

// Click listener for the filter menu
$('.filterbuttons a').on('click', function() {
    // For each filter link, get the 'data-filter' attribute value.
    var filter = $(this).data('filter');
    
    // Set global variable for future use
    currentFilter = filter;
    
    // Change which filter menu option is active, get slider index
    $(this).addClass('active').siblings().removeClass('active');
    var currentIdx = $('.range-slider').val();
    
    // Remove current map layer, create new one with appropriate filter
    currentMap.removeLayer(geoJsonLayer);
    geoJsonLayer = createPropSymbols(rawJson, currentMap, currentIdx, filter);
    currentLayer = geoJsonLayer;
    
    // Add new layer to map, wipe away the info panel
    currentMap.addLayer(geoJsonLayer);
    updateLegend(currentMap, currentAttribute);
});

//calculate the radius of each proportional symbol
function calcPropRadius(attValue) {
    //scale factor to adjust symbol size evenly
    var scaleFactor = 0.05;
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
        fillColor: "#006dad",
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.75
    };

    //For each feature, determine its value for the selected attribute
    var attValue = Number(feature.properties[attribute]);

    //Give each feature's circle marker a radius based on its attribute value
    geoJsonOptions.radius = calcPropRadius(attValue);

    //create circle marker layer
    var layer = L.circleMarker(latlng, geojsonMarkerOptions);

    //create popup
    var popup = new Popup(feature.properties, attribute, layer, geojsonMarkerOptions.radius);

    //add popup to circle marker
    popup.bindToLayer();
    
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
function createPropSymbols(data, map, idx, filterStr) {
    
    // Get and store current attributes based on index (idx)
    var attribute = currentAttributes[idx]
    currentAttribute = attribute
    
    // Create marker options
    var geojsonMarkerOptions = {
        radius: 8,
        fillColor: "#006dad",
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.6
    }
    
    var geoJsonOptions = {
        pointToLayer: function (feature, latlng){
            
            // For each feature, determine its value for the selected attribute
            var attValue = Number(feature.properties[attribute])
            
            // Test for variable type, then give each feature's circle marker a radius based on its attribute value 
            // This code was written in hopes of adding a switch to flip to population as the main variable on the map
            var strTest = attribute.search("yr")
            if (strTest > -1) {
                geojsonMarkerOptions.radius = calcPropRadius(attValue, 0.1)
                details = ["Vehicles", ""]   
            }
            
            // Create circle marker layer
            var layer = L.circleMarker(latlng, geojsonMarkerOptions)
            
            // Build popup content string
            var popupContent = ""
            var year = attribute.slice(-4)
            popupContent += "<p><b>" + details[0] + " in " + year + ":</b> " + numberWithCommas(feature.properties[attribute]) + details[1] + "</p>"

            // Bind the popup to the circle marker
            layer.bindPopup(popupContent, {
                offset: new L.Point(0, -geojsonMarkerOptions.radius),
                closeButton: false
            })
            
            // Event listeners to open popup on hover, update the info panel on click and
            // Add clicked feature to global variable for future use
            layer.on({
                mouseover: function(){
                    this.openPopup()
                },
                mouseout: function(){
                    this.closePopup()
                },
                click: function(){
                    featureSelected = feature
                    updatePanel(currentAttribute, details)
                }
            })

            return layer;
        },
        filter: function(feature, layer) { // Add filter function for new geoJsonLayer
            // If the data-filter attribute is set to "all", return all (true)
            // Otherwise, filter markers based on population size
            var returnBool = false
            if (filterStr === 'all'){
                returnBool = true
            } else if (filterStr === 'high'){
                if (feature.properties[currentAttribute] > 30000) {
                    returnBool = true
                }
            } else if (filterStr === 'medium'){
                if ((feature.properties[currentAttribute] <= 30000) && (feature.properties[currentAttribute] > 15000)) {
                    returnBool = true
                }
            } else if (filterStr === 'low'){
                if ((feature.properties[currentAttribute] <= 15000)) {
                    returnBool = true
                }
            } 
            return returnBool
        }
    };
    
    // Create a Leaflet GeoJSON layer, based on rawJson data and previously defined geoJsonOptions
    var geoJsonLayer = L.geoJson(data, geoJsonOptions)
    
    return geoJsonLayer    
};

// Calculate the radius of each proportional symbol
function calcPropRadius(attValue, scaleFactor) {

    // Area based on attribute value and scale factor
    var area = attValue * scaleFactor

    // Radius calculated based on area
    var radius = Math.sqrt(area/Math.PI)

    return radius
}
//function to retrieve the data and place it on the map
function getData(map){
    $.ajax("data/TahoeTrafficVolumes.geojson", {
        dataType: "json",
        success: function(response){
       // Set global rawJson to ajax response
            rawJson = response;
            // Process rawJson/response into lists of data sets- Percentage and Population
            var processedAttributes = processData(response);
            currentAttributes = processedAttributes[0];
            // Call function to create proportional symbols, put in a layer
            geoJsonLayer = createPropSymbols(response, map, 0, currentFilter);
            currentLayer = geoJsonLayer;
            // Call function to create sequence controls for user
            createSequenceControls(map, currentAttributes);
                    
            //add geo JSON layer to map
            map.addLayer(geoJsonLayer);
            
            // call function to create proportional symbol legend, must be called AFTER the above addLayer is called so that a layer already exists!
            createLegend(map, currentAttributes);
            updateLegend(map, currentAttributes[0]);
        }
    })
};
    
$(document).ready(createMap);