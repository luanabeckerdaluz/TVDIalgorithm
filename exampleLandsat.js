var coord_label_position = /* color: #d63000 */ee.Geometry.Point([-52.90799000231241, -28.226083749665666]);

/**
* Copyright (c) Luana Becker da Luz 2025
* 
* Luana Becker da Luz
* luanabeckerdaluz@gmail.com
* National Institute for Space Research (INPE)
* 
* Grazieli Rodigheri
* grazielirodigheri@gmail.com
* Federal University of Rio Grande do Sul (UFRGS)
* 
* This source code is licensed under the MIT license found in the LICENSE file 
* in the root directory of this source tree.
* _______________________________________________________________________________
* 
* This code has an example of the use of the two main TVDI functions developed 
* (singleTVDI and collectionTVDI). After obtaining the NDVI and LST collections, 
* the TVDI is computed for each pair of images using the collectionTVDI function. 
* The first image of each collection is also used below to exemplify the 
* computation of only one TVDI image by using the singleTVDI function.
*/

// ==============================================================================
// Region of Interest (ROI)
var ROI_FC = ee.FeatureCollection("projects/ee-luanabeckerdaluz/assets/paper2NPP/shapefiles/shpLavoura");
var ROI = ROI_FC.geometry()
var ROI_BBOX = ROI.bounds()
Map.addLayer(ROI, {}, 'ROI')
Map.centerObject(ROI)

// ==============================================================================
// Import gif_label and set gif parameters
var utils = require('users/luanabeckerdaluz/GEEtools:gif_label')
var gifFontScale = 1
var gifParams = {
  dimensions: 800,
  framesPerSecond: 3,
  ROI: ROI_BBOX
}

// ==============================================================================
// Set scale (m/px) to reproject and upscale/downscale the input 
// ... collections NDVI and LST and for using in TVDI function.
var SCALE_M_PX = 30

// ==============================================================================
// Required dates
var dates = ee.List([
  '2017-11-20', 
  '2018-01-07',
  '2018-02-08', 
  '2018-02-24'
])
var startDate = ee.Date(dates.get(0))
var endDate = ee.Date(dates.get(-1)).advance(1,"day")

// ==============================================================================
// Visualization palette
var pal = ['lightgreen','darkgreen','yellow','orange','red','darkred']
var LSTvis  = {min:294, max:308, palette:pal}
var NDVIvis = {min:0.2, max:1.0, palette:pal}
var TVDIvis = {min:-0.2, max:1, palette:pal}


/**===================================================================
* NDVI images and LST images
*==================================================================*/

/*
Author: Sofia Ermida (sofia.ermida@ipma.pt; @ermida_sofia)
This code is free and open. By using this code and any data derived with it, 
you agree to cite the following reference in any publications derived from them:
Ermida, S.L., Soares, P., Mantas, V., Göttsche, F.-M., Trigo, I.F., 2020. 
    Google Earth Engine open-source code for Land Surface Temperature estimation from the Landsat series.
    Remote Sensing, 12 (9), 1471; https://doi.org/10.3390/rs12091471
*/

// link to the code that computes the Landsat LST
var LandsatLST = require('users/sofiaermida/landsat_smw_lst:modules/Landsat_LST.js')

var NDVI_LST_IC = ee.ImageCollection(dates.map(function(dateString){
  var sd = ee.Date(dateString)
  var ed = ee.Date(dateString).advance(1,"day")
  
  return LandsatLST.collection("L8", sd, ed, ROI_BBOX, true)
    .select("NDVI", "LST")
    .mosaic()
    .reproject("EPSG:4326", null, SCALE_M_PX)
    .clip(ROI)
    .set("date", dateString)
}))


// Generate NDVI collection and gif

var collectionNDVI = NDVI_LST_IC
  .select("NDVI")
  
Map.addLayer(collectionNDVI.first(), NDVIvis, 'IN - collectionNDVI img1')

var GIFcollectionNDVI = collectionNDVI.map(function(img){ 
  return img.visualize(NDVIvis).set("date", img.get("date")) 
})
var GIF_NDVI = utils.gif_label_return({
  col: GIFcollectionNDVI,
  coord_label_position: coord_label_position,
  col_label_attribute: "date",
  fontScale: gifFontScale,
  gifParams: gifParams
})

// Generate LST collection and gif

var collectionLST = NDVI_LST_IC
  .select("LST")
  .map(function(img){
    return img
      .subtract(273.15) // Kelvin to Celsius
      .copyProperties(img)
  })

Map.addLayer(collectionLST.first(), LSTvis, 'IN - collectionLST img1')

var GIFcollectionLST = collectionLST.map(function(img){ 
  return img.visualize(LSTvis).set("date", img.get("date")) 
})
var GIF_LST = utils.gif_label_return({
  col: GIFcollectionLST,
  coord_label_position: coord_label_position,
  col_label_attribute: "date",
  fontScale: gifFontScale,
  gifParams: gifParams
})


print("================== INPUTS ===================",
      "- Region of Interest: ", 
      ROI,
      "- Scale (m/px):",
      SCALE_M_PX,
      "- Image Collection NDVI: ", 
      collectionNDVI,
      GIF_NDVI,
      "- Image Collection LST: ", 
      collectionLST,
      GIF_LST
)

// ==============================================================================
// Compute TVDI

var computeTVDI = require('users/luanabeckerdaluz/TVDIalgorithm:computeTVDI')

print("========== collectionTVDI example ==========")

// Compute collection TVDI
var collectionTVDI = computeTVDI.collectionTVDI(
  collectionNDVI, 
  collectionLST, 
  ROI, 
  SCALE_M_PX,
  true // When computing, copy "date" property from NDVI
)

// Generate gif
var GIFcollectionTVDI = collectionTVDI.map(function(img){ 
  return img.visualize(TVDIvis).set("date", img.get("date")) 
})
var GIF_TVDI = utils.gif_label_return({
  col: GIFcollectionTVDI,
  coord_label_position: coord_label_position,
  col_label_attribute: "date",
  fontScale: gifFontScale,
  gifParams: gifParams
})

// Print and add the first two computed images to the map
var img1 = ee.Image(collectionTVDI.toList(collectionTVDI.size()).get(0))
var img2 = ee.Image(collectionTVDI.toList(collectionTVDI.size()).get(1))
Map.addLayer(img1, TVDIvis, 'OUT - collectionTVDI img1')
Map.addLayer(img2, TVDIvis, 'OUT - collectionTVDI img2')
print(
  collectionTVDI,
  GIF_TVDI,
  "The first two TVDI images...",
  "have been added to the map!"
)


print("=========== singleTVDI example =============")

var NDVI = collectionNDVI.first()
var LST = collectionLST.first()

// Computes the number of pixels in both images
var reduceRegionParameters = {
  reducer: ee.Reducer.count(), 
  scale:SCALE_M_PX,
  geometry: ROI
}
print('Note that both images have different numbers of pixels:',
      'NDVI Pixels count:', 
      ee.Number(NDVI.reduceRegion(reduceRegionParameters).get("NDVI")),
      'LST Pixels count:',  
      ee.Number(LST.reduceRegion(reduceRegionParameters).get("LST")))

// If true, the singleTVDI function displays the results of variables calculated. 
var DEBUG_FLAG = true 

// Compute singleTVDI
var imageTVDI = computeTVDI.singleTVDI(
  NDVI, 
  LST, 
  ROI, 
  SCALE_M_PX, 
  DEBUG_FLAG
)

// Print and add TVDI single image to the map
Map.addLayer(imageTVDI, TVDIvis, "OUT - imageTVDI")
print("imageTVDI:", 
      imageTVDI,
      imageTVDI.getDownloadURL({name:"TVDI", region:ROI}))

