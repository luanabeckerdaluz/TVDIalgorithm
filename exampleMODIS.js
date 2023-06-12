/**
* Copyright (c) Leonardo Becker da Luz 2023
* 
* Leonardo Becker da Luz
* leobeckerdaluz@gmail.com
* National Institute for Space Research (INPE)
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
var ROIasset = "users/leobeckerdaluz/Artigo2_NPP/shapefiles/shpMesoregionRS"
var ROI_FC = ee.FeatureCollection(ROIasset)
var ROI = ROI_FC.geometry()
Map.addLayer(ROI, {}, 'ROI')
Map.centerObject(ROI)



// ==============================================================================
// Set scale (m/px) to reproject and upscale/downscale the input 
// ... collections NDVI and LST and for using in TVDI function.
var SCALE_M_PX = 1000



// ==============================================================================
// Required dates
var dates = ee.List([
  '2018-01-01',
  '2018-01-17',
  '2018-02-02',
  '2018-02-18'
])
var startDate = ee.Date(dates.get(0))
var endDate = ee.Date(dates.get(-1)).advance(1,"day")



// ==============================================================================
// Visualization palette
var pal = ['lightgreen','darkgreen','yellow','orange','red','darkred']
var LSTvis  = {min:294, max:308, palette:pal}
var NDVIvis = {min:0.2, max:1.0, palette:pal}
var TVDIvisParams = {min:-0.2, max:1, palette:pal}



// ==============================================================================
// NDVI collection
var collectionNDVI = ee.ImageCollection('MODIS/061/MOD13Q1')
  .filterBounds(ROI)
  .filterDate(startDate, endDate)
  .select('NDVI')
  .map(function(img){
    return img
      .multiply(0.0001)                             // Apply band scale
      .reproject('EPSG:4326', null, SCALE_M_PX)     // Reproject and Down/Upscale
      .clip(ROI)                                    // Clip to geometry
      .set("date", img.date().format("yyyy-MM-dd")) // Set date property
  })
  .filter(ee.Filter.inList('date', dates))          // Obtain just desired dates

Map.addLayer(collectionNDVI.first(), NDVIvis, 'IN - collectionNDVI img1')



// ==============================================================================
// LST collection
var collectionLST = ee.ImageCollection('MODIS/061/MOD11A2')
  .filterBounds(ROI)
  .filterDate(startDate, endDate)
  .select('LST_Day_1km')
  .map(function(img){
    return img
      .rename('LST')                                // Rename band
      .multiply(0.02)                               // Apply band scale
      .reproject('EPSG:4326', null, SCALE_M_PX)     // Reproject and Down/Upscale
      .clip(ROI)                                    // Clip to geometry
      .set("date", img.date().format("yyyy-MM-dd")) // Set date property
  })
  .filter(ee.Filter.inList('date', dates))          // Obtain just desired dates

Map.addLayer(collectionLST.first(), LSTvis, 'IN - collectionLST img1')



print("================== INPUTS ===================",
      "- Region of Interest: ", 
      ROI,
      "- Scale (m/px):",
      SCALE_M_PX,
      "- Image Collection NDVI: ", 
      collectionNDVI,
      "- Image Collection LST: ", 
      collectionLST)



// ==============================================================================
// Compute TVDI

var computeTVDI = require('users/leobeckerdaluz/TVDI_algorithm:computeTVDI')



print("========== collectionTVDI example ==========")

// Compute collection TVDI
var collectionTVDI = computeTVDI.collectionTVDI(
  collectionNDVI, 
  collectionLST, 
  ROI, 
  SCALE_M_PX
)

// Print and add the first two computed images to the map
var img1 = ee.Image(collectionTVDI.toList(collectionTVDI.size()).get(0))
var img2 = ee.Image(collectionTVDI.toList(collectionTVDI.size()).get(1))
Map.addLayer(img1, TVDIvisParams, 'OUT - collectionTVDI img1')
Map.addLayer(img2, TVDIvisParams, 'OUT - collectionTVDI img2')
print(
  collectionTVDI, 
  'The first two calculated TVDI images have been added to the map!'
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
Map.addLayer(imageTVDI, TVDIvisParams, "OUT - imageTVDI")
print("imageTVDI:", 
      imageTVDI,
      imageTVDI.getDownloadURL({name:"TVDI", region:ROI}))

