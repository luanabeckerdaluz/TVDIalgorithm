/**
* Copyright (c) Luana Becker da Luz and Juliano Schirmbeck 2023
* 
* Luana Becker da Luz
* luanabeckerdaluz@gmail.com
* National Institute for Space Research (INPE)
* 
* Juliano Schirmbeck
* schirmbeck.j@gmail.com
* University of Vale do Taquari (UNIVATES)
* 
* This source code is licensed under the MIT license found in the LICENSE file 
* in the root directory of this source tree.
* ____________________________________________________________________________
* 
* This code contains two main functions that can be used to calculate TVDI. One 
* of them is used to generate the TVDI based on only one NDVI and one LST image 
* (singleTVDI), and the other function is used to generate the TVDI for several 
* NDVI and several LST images (collectionTVDI). The functions are exported and 
* can be accessed by external codes.
* 
* The methodology used to compute TVDI is based on the L. W. Schirmbeck papers
* and it is detailed in:
* -https://doi.org/10.1590/1678-992X-2016-0315 (Scientia Agricola)
* -https://doi.org/10.1590/0102-7786344070     (Revista Brasileira de Meteorologia)
*/




/**
* handleInputs
* 
* Handle input values. Some values must not be null.
* 
* @param  {Object} NDVI: NDVI input
* @param  {Object} LST: LST input
* @param  {Object} ROIgeometry: Region of Interest
* @param  {Object} SCALE_M_PX: Spatial Resolution of input images
* @param  {boolean} isCollection: internal flag
* @return {string or boolean} Returns the error string or returns false (no error)
*/
var handleInputs = function(NDVI, LST, ROI, SCALE_M_PX, isCollection){
  var error = ""
  
  // input NDVI Image or ImageCollection must not be null
  if (NDVI === null){
    if (isCollection){
      error += "ERROR: imageCollectionNDVI must not be null!\n"
    }
    else{
      error += "ERROR: imageNDVI must not be null!\n"
    }
  }

  // input LST Image or ImageCollection must not be null
  if (LST === null){
    if (isCollection){
      error += "ERROR: imageCollectionLST must not be null!\n"
    }
    else{
      error += "ERROR: imageLST must not be null!\n"
    }
  }
  
  // input ROI must not be null
  if (ROI === null){
    error += "ERROR: ROI must not be null!\n"
  }
  
  // input SCALE_M_PX must not be null
  if(SCALE_M_PX === null){
    error += "ERROR: SCALE_M_PX must not be null!\n"
  }
  
  // The collections must have the same size
  if (isCollection && NDVI !== null && LST !== null){
    var sizeIsDifferent = ee.Algorithms.If((NDVI.size()).neq(LST.size()), true, false)
    if (sizeIsDifferent.getInfo()){
      error = "ERROR: NDVI and LST collections don't have the same size!"
    }
  }
  
  // Returns the error if there was an error
  if (error){
    return error
  }
  else{
    return false
  }
}




/**
* singleTVDI
* 
* Compute the TVDI output image based on a NDVI image and a LST image. 
* 
* @param  {Image} imageNDVI: NDVI image to be processed
* @param  {Image} imageLST: LST image to be processed
* @param  {Geometry} ROI: Region of Interest
* @param  {Number} SCALE_M_PX: Spatial Resolution of input images
* @param  {boolean} DEBUG_FLAG: User defines if wants to debug results
* @return {Image} imageTVDI: TVDI image processed
*/
var singleTVDI = function(imageNDVI, imageLST, ROI, SCALE_M_PX, DEBUG_FLAG){
  
  // Handle inputs
  var error = handleInputs(imageNDVI, imageLST, ROI, SCALE_M_PX, false)
  if (error){
    print(error)
    return error
  }
  // If user didn't define the debug flag, set to false
  if (!DEBUG_FLAG){
    DEBUG_FLAG = false
  }
  
  // Reproject NDVI and LST images
  imageNDVI = ee.Image(imageNDVI)
    .reproject('EPSG:4326', null, SCALE_M_PX)
    .rename("NDVI")
  imageLST = ee.Image(imageLST)
    .reproject('EPSG:4326', null, SCALE_M_PX)
    .rename("LST")
  
  /**
  * Get the LST pixels for each 0.01 NDVI interval.
  * Note that some NDVI intervals may not contain any pixels. In
  * these cases, the map function will return null and the value
  * is deleted from map by using the dropNulls parameter.
  */ 
  
  // Iterates over the 100 intervals
  var LSTValuesOnNDVIIntervals = ee.List.sequence(0,99).map(
    // Map function
    function(i){
      // Get min and max values of the current NDVI interval
      var minNDVI = ee.Number(i).multiply(0.01)
      var maxNDVI = ee.Number(i).add(1).multiply(0.01)
      
      // Creates a mask with only pixels whose values are within the NDVI interval.
      var valuesGreaterThanMinNDVI = imageNDVI.gt(minNDVI)
      var valuesLessThanMaxNDVI = imageNDVI.lt(maxNDVI)
      var maskIntervalNDVI = valuesGreaterThanMinNDVI
        .and(valuesLessThanMaxNDVI)
        .selfMask()
      
      // Get LST values for the current NDVI interval
      var LSTOnInterval = imageLST.updateMask(maskIntervalNDVI).rename('LST')
    
      // Calculate the number of distinct LST pixels of this interval 
      var countDistinctStats = LSTOnInterval.reduceRegion({
        reducer: ee.Reducer.countDistinct(), 
        geometry: ROI,
        scale: SCALE_M_PX,
        maxPixels: 1E9
      });
      var countDistinctNumber = ee.Number(countDistinctStats.get('LST'))
      
      /**
       * If there is more than 1 distinct LST pixel, return the mask. Otherwise, 
       * return null, because it will not be possible to compute the histogram in 
       * the next step. When returning null, the dropNulls parameter of the map
       * function will ignore these null values. 
       */
      return ee.Algorithms.If(countDistinctNumber.gt(1), LSTOnInterval, null)
    },
    // dropNulls parameter of map function
    true
  )
  
  
  /**
  * Get Dry Edge and Wet Edge pixels.
  * 
  * This map function will iterate over the LST masks generated in the
  * previous step (which can be less than 100 masks), compute the LST 
  * histogram for each mask and obtain Dry Edge and Wet Edge pixels.
  * After the processing, this variable "edgesPixelsMasks" will contain 
  * a list (N intervals) of list (dry and wet edge masks)
  */
  var edgesPixelsMasks = LSTValuesOnNDVIIntervals.map(function(LSTOnInterval){
    // Cast LST mask (list item) to an Image
    LSTOnInterval = ee.Image(LSTOnInterval)
    
    // Compute frequency histogram for the LST mask
    var frequencyHistogram = LSTOnInterval.reduceRegion({
      reducer: ee.Reducer.frequencyHistogram(),
      geometry: ROI,
      scale: SCALE_M_PX,
      maxPixels: 1E9
    })
    // Get histogram values (Dictionary)
    var histogramDict = ee.Dictionary(frequencyHistogram.get('LST'))
    
    // Get frequency values, accumulate and normalize them.
    var accumulatedHistogramLSTs = histogramDict.toArray().accum(0)
    var lastAccumulatedHistogramLSTs = accumulatedHistogramLSTs.get([-1])
    var accumulatedHistogramLSTsNormalized = accumulatedHistogramLSTs
      .divide(lastAccumulatedHistogramLSTs)
    
    // Get temperatures from histogram
    var histogramLSTs = histogramDict.keys()
    
    // Get the LST value of the first occurence of >98% and >2%
    var indexGTE02Percent = accumulatedHistogramLSTsNormalized.gte(0.02).toList().indexOf(1)
    var indexGTE98Percent = accumulatedHistogramLSTsNormalized.gte(0.98).toList().indexOf(1)
    var LSTValueGTE02 = ee.Number.parse(histogramLSTs.get(indexGTE02Percent))
    var LSTValueGTE98 = ee.Number.parse(histogramLSTs.get(indexGTE98Percent))
    
    /**
     * Wet Edge Pixels: Values less than the first occurence of >2%
     * Dry Edge Pixels: Values greater than or equal the the first occurence of >98%
     */
    var wetEdgePixels = LSTOnInterval.lt(LSTValueGTE02).selfMask()
    var dryEdgePixels = LSTOnInterval.gte(LSTValueGTE98).selfMask()
    
    // Returns a list containing the Wet Edge mask and the Dry Edge mask
    return ee.List([wetEdgePixels, dryEdgePixels])
  })
  
  
  /**
  * Merge all Wet Edge masks and all Dry Edge masks.
  * 
  * Iterate the list containing all Wet Edge masks and merge all, generating 
  * one Wet Edge mask for the scene. The same is done with Dry Edge masks.
  */
  
  // Wet Edge masks are in the first position of each list item
  var wetEdgePixelsMask = 
    ee.ImageCollection(
      edgesPixelsMasks.map(function(listItem){
        return ee.Image(ee.List(listItem).get(0))
      })
    )
    .mosaic()
  
  // Dry Edge masks are in the second position of each list item
  var dryEdgePixelsMask = 
    ee.ImageCollection(
      edgesPixelsMasks.map(function(listItem){
        return ee.Image(ee.List(listItem).get(1))
      })
    )
    .mosaic()

  
  // Compute the linear fit of all Dry Edge pixels
  
  // Get NDVI values from Dry Edge pixels
  var dryEdgeNDVI = imageNDVI.updateMask(dryEdgePixelsMask)
  // Get LST values from Dry Edge pixels
  var dryEdgeLST = imageLST.updateMask(dryEdgePixelsMask)
  // Group dry edge NDVI and LST into a single raster to compute linear fit
  var dryEdgeNDVIAndLST = dryEdgeNDVI.rename('b1').addBands(dryEdgeLST.rename('b2'))
  // Compute the linear fit
  var linearFit = dryEdgeNDVIAndLST.reduceRegion({
    reducer: ee.Reducer.linearFit(), 
    geometry: ROI, 
    scale: SCALE_M_PX,
    maxPixels: 1E9
  });
  // Obtains linear fit parameters
  var dryEdgeOffset_a = ee.Number(linearFit.get('offset'))
  var dryEdgeSlope_b = ee.Number(linearFit.get('scale'))
  
  
  // Calculate the average temperature of all Wet Edge pixels
  
  // Get LST values for all Wet Edge pixels
  var wetEdgeLST = imageLST.updateMask(wetEdgePixelsMask)
  // Calculate the LST mean
  var wetEdgeLSTMean = ee.Number(
    wetEdgeLST.reduceRegion({
      reducer: ee.Reducer.mean(), 
      geometry: ROI, 
      scale: SCALE_M_PX,
      maxPixels: 1E9
    })
    .get('LST')
  )
  
  
  // Calculate TVDI
  var imageTVDI = imageLST
    .expression(
      '(LST - LSTmin) / (a + b*NDVI - LSTmin)', {
        'LST': imageLST,
        'LSTmin': wetEdgeLSTMean,
        'a': dryEdgeOffset_a,
        'b': dryEdgeSlope_b,
        'NDVI': imageNDVI,
      }
    )


  // Clip and clamp TVDI
  imageTVDI = imageTVDI
    .rename("TVDI")
    .clip(ROI)
    .clamp(0,1)
  
  
  // If the user set true on this function parameter, print debug results
  if(DEBUG_FLAG){
    print(
      "======== TVDI DEBUG ========",
      'LSTValuesOnNDVIIntervals:', LSTValuesOnNDVIIntervals,
      'Wet and Dry edges pixels:', edgesPixelsMasks,
      'Dry Edge a_offset:', dryEdgeOffset_a, 
      'Dry Edge b_slope:', dryEdgeSlope_b,
      'Wet Edge LST mean:', wetEdgeLSTMean,
      "============================"
    )
  }
  
  
  // Return TVDI image
  return imageTVDI
}




/**
* collectionTVDI
* 
* Compute the TVDI output collection based on a NDVI collection and a LST collection.
* 
* @param  {ImageCollection} imageCollectionNDVI: NDVI collection to be processed
* @param  {ImageCollection} imageCollectionLST: LST collection to be processed
* @param  {FeatureCollection} ROI: Region of Interest
* @param  {Number} SCALE_M_PX: Spatial Resolution of input images
* @param  {boolean} DEBUG_FLAG: User defines if wants to debug results
* @return {ImageCollection} ImageCollectionTVDI: TVDI collection processed
*/
var collectionTVDI = function(
  imageCollectionNDVI, 
  imageCollectionLST, 
  ROI, 
  SCALE_M_PX){
  
  // Handle inputs
  var error = handleInputs(imageCollectionNDVI, imageCollectionLST, ROI, SCALE_M_PX, true)
  if (error){
    print(error)
    return error
  }
  
  /** Obtain ImageCollections sizes. They all have the same size because 
   * this has been checked previously. 
   */
  var size = imageCollectionNDVI.size()
  
  // Convert ImageCollections into Lists in order to iterate
  var IClistNDVI = imageCollectionNDVI.toList(imageCollectionNDVI.size())
  var IClistLST = imageCollectionLST.toList(imageCollectionLST.size())
  
  // Iterates through the collections from 0 to size-1
  var sequenceRange = ee.List.sequence(0, size.subtract(1))
  var resultsTVDI = sequenceRange.map(function(i){
    // Get NDVI and LST images at index i.
    var NDVI = ee.Image(IClistNDVI.get(i))
    var LST = ee.Image(IClistLST.get(i))
    
    /**
     * Compute single TVDI. Observe that the DEBUG_FLAG flag is automatically set
     * to false because it is not possible to print within the map function. 
     */
    var TVDI = singleTVDI(NDVI, LST, ROI, SCALE_M_PX, false)
    
    return TVDI.set("system:index", ee.String(i));
  })
  
  // Since a list has been iterated through, now cast to an ImageCollection
  var imageCollectionTVDI = ee.ImageCollection(resultsTVDI)
  
  // Return TVDI ImageCollection
  return imageCollectionTVDI
}



// Exports the singleTVDI and collectionTVDI functions to be accessed from other codes
exports.singleTVDI = singleTVDI
exports.collectionTVDI = collectionTVDI
