/**
* Copyright (c) Leonardo Becker da Luz and Grazieli Rodigheri 2023
* 
* Leonardo Becker da Luz
* leobeckerdaluz@gmail.com
* National Institute for Space Research (INPE)
* 
* Grazieli Rodigheri
* grazielirodigheri@gmail.com
* Federal University of Rio Grande do Sul (UFRGS)
* 
* This source code is licensed under the MIT license found in the LICENSE file 
* in the root directory of this source tree.
* ____________________________________________________________________________
* 
* This code has an example of the use of the two main TVDI functions developed 
* (singleTVDI and collectionTVDI). After obtaining the NDVI and LST collections, 
* the TVDI is computed for each pair of images using the collectionTVDI function. 
* The first image of each collection is also used to exemplify the computation 
* of only one TVDI image by using the singleTVDI function.
*/


 
// ===================================================================
// Region of Interest (ROI)
var ROI = RSgeom

Map.addLayer(ROI, {}, 'ROI')
Map.centerObject(ROI)


// ===================================================================
// Set scale (m/px) to upscale/downscale NDVI and LST images
var SCALE_M_PX = 1000
// var SCALE_M_PX = 250


// ===================================================================
// All desired dates
var dates = ['2018_01_01','2018_01_17','2018_02_02','2018_02_18']


// ===================================================================
// NDVI collection
var imageCollectionNDVI = ee.ImageCollection('MODIS/061/MOD13Q1')
  .filterBounds(ROI)
  .filter(ee.Filter.inList('system:index', dates))
  .select('NDVI')
  .map(function(image){
    return image
      .clip(ROI)
      .rename('NDVI')                             // Rename band
      .multiply(0.0001)                           // Apply band scale
      .reproject('EPSG:4326', null, SCALE_M_PX)   // Downscale/Upscale image
  })

Map.addLayer(imageCollectionNDVI.first(), {min:0.2,max:1.0,palette:['red','white','darkgreen']}, 'imageCollectionNDVI first')


// ===================================================================
// LST collection
var imageCollectionLST = ee.ImageCollection('MODIS/061/MOD11A2')
  .filterBounds(ROI)
  .filter(ee.Filter.inList('system:index', dates))
  .select('LST_Day_1km')
  .map(function(image){
    return image
      .clip(ROI)
      .rename('LST')                              // Rename band
      .multiply(0.02)                             // Apply band scale
      .reproject('EPSG:4326', null, SCALE_M_PX)   // Downscale/Upscale image
  })

Map.addLayer(imageCollectionLST.first(), {min:294, max:308, palette:['lightgreen','darkgreen','yellow','orange','red','darkred']}, 'imageCollectionLST first')


print("================== INPUTS ===================",
      "- Region of Interest: ", 
      ROI,
      "- Scale (m/px):",
      SCALE_M_PX,
      "- Image Collection NDVI: ", 
      imageCollectionNDVI,
      "- Image Collection LST: ", 
      imageCollectionLST)



// ===================================================================
// Compute TVDI
// ===================================================================

var computeTVDI = require('users/leobeckerdaluz/TVDI_algorithm:computeTVDI')

var TVDIvisParams = {min:-0.2, max:1, palette:['lightgreen','darkgreen','yellow','orange','red','darkred']}


print("========== collection TVDI example ==========")

var imageCollectionTVDI = computeTVDI.collectionTVDI(imageCollectionNDVI, imageCollectionLST, ROI, SCALE_M_PX, true)

print(imageCollectionTVDI)
var img1 = ee.Image(imageCollectionTVDI.toList(imageCollectionTVDI.size()).get(0))
var img2 = ee.Image(imageCollectionTVDI.toList(imageCollectionTVDI.size()).get(1))
Map.addLayer(img1, TVDIvisParams, 'imageCollectionTVDI img1')
Map.addLayer(img2, TVDIvisParams, 'imageCollectionTVDI img2')
print('The first two calculated TVDI images were added to the map!')


print("============ image TVDI example =============")

var NDVI = imageCollectionNDVI.first()
var LST = imageCollectionLST.first()

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

/* 
Compute singleTVDI. Note that when true, the flag DEBUG_FLAG displays the 
results of variables calculated in TVDI 
*/
var DEBUG_FLAG = true 
var imageTVDI = computeTVDI.singleTVDI(NDVI, LST, ROI, SCALE_M_PX, true)

Map.addLayer(imageTVDI, TVDIvisParams, "imageTVDI")
print("imageTVDI:", 
      imageTVDI,
      imageTVDI.getDownloadURL({name:"TVDI", region:ROI}))

