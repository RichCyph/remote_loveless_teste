/* Here are our loaders set up an object*/

const LOADERS = {
    obj:function(){return new THREE.OBJLoader()},
    stl:function(){return new THREE.STLLoader()},
    glb:function(){return new THREE.GLTFLoader()}
}

/* Here are our exporters set up an object*/

const EXPORTERS = {
    obj:function(){return new THREE.OBJExporter()},
    stl:function(){return new THREE.STLExporter()},
    glb:function(){return new THREE.GLTFExporter()}
}

function createRenderer(elem){
    let renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(elem.clientWidth, elem.clientHeight);
    /* We need these last two initializations to show shadow */
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowmapping;
    return renderer;
}

/* We add our light to the camera because the camera moves using "orbitControls.js
   We want our light to remain at the right angle to our object so we already get good depth
   when viewing the imprint.*/
   
function createCamera(elem){
    var camera = new THREE.PerspectiveCamera(
    75, window.innerWidth / window.innerHeight, 0.1, 1000);
    let light = new createLight();
    camera.add(light);
    return camera;
}

/* Here is our basic orbit control setup with autorotate set to false so
   we dont' get movement when we don't want it.*/
   
function createControls(camera, renderer){
    let controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.rotateSpeed = 0.5;
    controls.dampingFactor = 0.1;
    controls.enableZoom = true;
    controls.autoRotate = false;
    controls.autoRotateSpeed = .75;
    return controls;
}

/* We create a scene with a white background */

function createScene(){
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('white');
    return scene;
}

class Resizer{
    constructor(container, camera, renderer){
    camera.aspect = container.clientWidth/container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
  }

  resize(){
  }
}

/* This is where our final model is exported.
It requires the FileSaver.js script which seems to give
some weird error but still works.*/

function saveFile(mesh, exporter, file_name, file_type){
    var str = exporter.parse( mesh );
    var blob = new Blob( [str], { type : 'text/plain' } );
    saveAs( blob, file_name + file_type );
}

/* Here is our load model function which returns a promise to load*/

function loadModel(model, loader) {
    return new Promise( (resolve, reject) => {
        loader.load(model, function (object) {
            resolve(object);
        });
    });
}

function createObject(geometry,material){
    mesh = new THREE.Mesh(geometry, material);
    return mesh;
}

/* We use just one light to keep things fast and with
   shadow turned on and settings allied */
function createLight(){
    let directionalLight = new THREE.DirectionalLight( 0xFFFFFF, 0.9 );
    directionalLight.position.set(0.,1.,0.);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 512;
    directionalLight.shadow.mapSize.height = 512;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    return directionalLight;
}

/* This is used to move the camera around to a good starting
view  point. Orinally it served to center the models but
I do that in blender before hand. */
function centerObject(geometry,camera, mesh){
    var middle = new THREE.Vector3();
    geometry.computeBoundingBox();
    geometry.boundingBox.getCenter(middle);
    /*mesh.geometry.applyMatrix(new THREE.Matrix4().makeTranslation(
                            -middle.x, -middle.y, -middle.z ) );*/

    var largestDimension = Math.max(geometry.boundingBox.max.x,
                        geometry.boundingBox.max.y,
                        geometry.boundingBox.max.z)
    camera.position.z = -largestDimension * 1.5;//geometry.boundingBox.max.z*1.5;
    camera.position.x = largestDimension * 1.5;//geometry.boundingBox.max.z*1.5;//largestDimension * 1.5;
    camera.position.y = largestDimension * 1.5;
}
