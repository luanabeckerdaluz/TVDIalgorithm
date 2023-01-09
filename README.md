<h2 align="center">
  TVDI algorithm
</h2>

<h4 align="center">Google Earth Engine function to compute the Temperature-Vegetation Dryness Index (TVDI).</h4>

<p align="center">
<a href="https://www.repostatus.org/#active"><img src="https://www.repostatus.org/badges/latest/active.svg" alt="Project Status: Active – The project has reached a stable, usable
state and is being actively
developed."></a>
<a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/license-MIT-green" alt="License"></a>
<a href="https://www.tidyverse.org/lifecycle/#maturing"><img src="https://img.shields.io/badge/lifecycle-maturing-blue.svg" alt="lifecycle"></a>
<br>
</p>


<p align="center">  
  • <a href="#methodology">Methodology</a> &nbsp;
  • <a href="#example">Example</a> &nbsp;
  • <a href="#citation">Citation</a> &nbsp;
</p>


<h1 align="center">
  <a><img src="https://user-images.githubusercontent.com/27021459/175127149-02e4bec3-8ef1-4587-91d1-97b8faa7a668.png" alt="Markdownify" width="600"></a>
</h1>


[Google Earth Engine](https://earthengine.google.com/) is a cloud-based platform that allows users to have an easy access to a petabyte-scale archive of remote sensing data and run geospatial analysis on Google's infrastructure. The present work developed a function in Google Earth Engine to calculate the TVDI index based on the paper [L. W. Schirmbeck et al., 2018](https://doi.org/10.1590/1678-992X-2016-0315).



## Methodology
The methodology used in this work was the same used in the paper written by Lucimara Wolfarth Schirmbeck, Denise Cybis Fontana and Juliano Schirmbeck called [Two approaches to calculate TVDI in humid subtropical climate of southern Brazil](https://doi.org/10.1590/1678-992X-2016-0315), published in 2018. This methodology briefly consists of the following steps: 

- Slice the NDVI values into 100 intervals of 0.01 and obtain the LST values for each of these intervals;
- Construct the cumulative frequency histogram for each NDVI interval and identify the LST values corresponding to 2% and 98% occurrence;
- Define the pixels of the wet edge (all pixels with LST < temperature corresponding to 2%) and the dry edge (all pixels with LST ≥ temperature corresponding to 98%). This procedure was performed for each of the 100 NDVI intervals;
- Group the pixels of each boundary and interval;
- Calculate the dry edge - Linear regression using all pixels that compose the dry edge to obtain the coefficients a and b of the fitted equation;
- Calculate the wet edge - Average value of all pixels that compose the wet edge;



## Example

The TVDI processing can be executed by using two main functions. One of them is used to generate the TVDI based on only one NDVI and one LST image (singleTVDI), and the other function is used to generate the TVDI for several NDVI and several LST images (collectionTVDI). 

### singleTVDI

``` r
// Obtain the Region of Interest
var ROI = ee.Geometry(...)

// Obtain the NDVI image to be processed
var imageNDVI = ee.Image(...)

// Obtain the LST image to be processed
var imageLST = ee.Image(...)

// Define the spatial resolution to downscale/upscale NDVI and LST images
var SCALE_M_PX = 250

// Define the DEBUG flag: If true, the function will print the results during processing
var DEBUG_FLAG = false

// Import TVDI processing module
var computeTVDI = require('users/leobeckerdaluz/TVDI_algorithm:computeTVDI')

// Compute TVDI
var imageTVDI = computeTVDI.singleTVDI(imageNDVI, imageLST, ROI, SCALE_M_PX, DEBUG_FLAG)

// Add TVDI as a layer
Map.addLayer(imageTVDI, {}, 'TVDI'}
```


### collectionTVDI

``` r
// Obtain the Region of Interest
var ROI = ee.Geometry(...)

// Obtain the NDVI image collection to be processed
var imageCollectionNDVI = ee.ImageCollection(...)

// Obtain the LST image collection to be processed
var imageCollectionLST = ee.ImageCollection(...)

// Define the spatial resolution to downscale/upscale NDVI and LST images
var SCALE_M_PX = 250

// Import TVDI processing module
var computeTVDI = require('users/leobeckerdaluz/TVDI_algorithm:computeTVDI')

// Compute TVDI
var imageCollectionTVDI = computeTVDI.collectionTVDI(imageCollectionNDVI, imageCollectionLST, ROI, SCALE_M_PX)

// Add TVDI first processed image as a layer
Map.addLayer(imageCollectionTVDI.first(), {}, 'TVDI'}
```
