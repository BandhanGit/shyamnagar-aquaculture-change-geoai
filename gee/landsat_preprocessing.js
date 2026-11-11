
var aoi = ee.FeatureCollection('projects/ee-bandhangeo/assets/Shaymnagar_Upazila');
var region = aoi.geometry();

// Landsat surface reflectance
function prepare(image, bands) {
  var qa = image.select('QA_PIXEL');
  var clear = qa.bitwiseAnd(31).eq(0);
  var saturation = image.select('QA_RADSAT').eq(0);

  return image.updateMask(clear).updateMask(saturation)
    .select(bands)
    .multiply(0.0000275).add(-0.2)
    .rename(['Blue', 'Green', 'Red', 'NIR', 'SWIR1', 'SWIR2']);
}

var bands5 = ['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B7'];
var bands8 = ['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7'];

// 1999 and 2014 imagery
var l5 = ee.ImageCollection('LANDSAT/LT05/C02/T1_L2')
  .filterBounds(region)
  .filterDate('1999-01-01', '1999-06-01')
  .filter(ee.Filter.lt('CLOUD_COVER', 80));

var l8 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
  .filterBounds(region)
  .filterDate('2014-01-01', '2014-06-01')
  .filter(ee.Filter.lt('CLOUD_COVER', 80));

var image1999 = l5.map(function(img) {
  return prepare(img, bands5);
}).median().clip(region);

var image2014 = l8.map(function(img) {
  return prepare(img, bands8);
}).median().clip(region);

// Combine both years
var names1999 = [
  'Blue_1999', 'Green_1999', 'Red_1999',
  'NIR_1999', 'SWIR1_1999', 'SWIR2_1999'
];

var names2014 = [
  'Blue_2014', 'Green_2014', 'Red_2014',
  'NIR_2014', 'SWIR1_2014', 'SWIR2_2014'
];

var stack = image1999.rename(names1999)
  .addBands(image2014.rename(names2014))
  .toFloat();

// View the imagery
Map.centerObject(aoi, 11);

Map.addLayer(image1999, {
  bands: ['Red', 'Green', 'Blue'],
  min: 0.02,
  max: 0.22,
  gamma: 1.3
}, 'Landsat 1999', false);

Map.addLayer(image2014, {
  bands: ['Red', 'Green', 'Blue'],
  min: 0.02,
  max: 0.22,
  gamma: 1.3
}, 'Landsat 2014');

Map.addLayer(aoi.style({
  color: 'red',
  fillColor: '00000000',
  width: 2
}), {}, 'Shyamnagar boundary');

// Export Landsat images
Export.image.toDrive({
  image: stack,
  description: 'Shyamnagar_Landsat_1999_2014',
  folder: 'Aquaculture_GeoAI',
  fileNamePrefix: 'Shyamnagar_Landsat_1999_2014',
  region: region.bounds(),
  scale: 30,
  crs: 'EPSG:32645',
  maxPixels: 1e9,
  fileFormat: 'GeoTIFF'
});
