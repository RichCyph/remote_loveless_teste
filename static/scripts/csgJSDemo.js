
//create renderer
function createRenderer(elem){
    let renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(elem.clientWidth, elem.clientHeight);
    return renderer;
}
//create camera
function createCamera(elem){
    /*
    let camera = new THREE.PerspectiveCamera(70,
                    elem.clientWidth/elem.clientHeight, 1, 1000);*/
    var camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    return camera;
}
//create controls

function createControls(camera, renderer){
    let controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.rotateSpeed = 0.5;
    controls.dampingFactor = 0.1;
    controls.enableZoom = true;
    controls.autoRotate = true;
    controls.autoRotateSpeed = .75;
    return controls;
}
//create scene
function createScene(){
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('coral');
    return scene;
}
//create resize
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

async function loadOBJ(model) {
    function load(model){
        return new Promise( (resolve, reject) => {

            const loader =  new THREE.VRMLLoader();//new THREE.OBJLoader();

                loader.load(model, function (object) {

                resolve(object);

                });

            });
    }
    let geometry = await load(model);
    return geometry;
}

async function loadSTL(model) {
    function load(model){
        return new Promise( (resolve, reject) => {

            const loader = new THREE.STLLoader();

                loader.load(model, function (object) {

                resolve(object);

                });

            });
    }
    let geometry = await load(model);
    return geometry;
}

//create object
function createObject(geometry){
    //console.log();
  //  geometry = CSG.cube();
 // geometry = new THREE.Mesh(new THREE.BoxGeometry(1,1,1))

    var material = new THREE.MeshPhongMaterial({
        color: 0xff5533,
        specular: 100,
        shininess: 100,
        wireframe:true

    });
    let meshA = new THREE.Mesh(new THREE.BoxGeometry(20,20,20), material);
    let meshB = new THREE.Mesh(new THREE.SphereGeometry( 10, 32, 32 ), material);
    meshB.position.add(new THREE.Vector3( 5, 5, 5));
    meshA.updateMatrix();
    meshB.updateMatrix();
    let bspA = CSG.fromMesh( meshA );
    let bspB = CSG.fromMesh( meshB );
    let bspResult = bspA.subtract(bspB);
    let mesh = CSG.toMesh( bspResult, meshA.matrix, meshA.material );//new THREE.Mesh(new THREE.BoxGeometry(20,20,20.), material)

    //\\let mesh = new THREE.Mesh(geometry, material);
    return mesh

}

//create lights
function createLight(){
    const light = new THREE.HemisphereLight(0xffffff, 1.5);
    return light;
}

function centerObject(geometry,camera, mesh){
    var middle = new THREE.Vector3();
        geometry.computeBoundingBox();
        geometry.boundingBox.getCenter(middle);

        mesh.geometry.applyMatrix(new THREE.Matrix4().makeTranslation(
                                      -middle.x, -middle.y, -middle.z ) );

        var largestDimension = Math.max(geometry.boundingBox.max.x,
                            geometry.boundingBox.max.y,
                            geometry.boundingBox.max.z)

        camera.position.z = largestDimension * 1.5;
}

//https://observablehq.com/@k9/exploring-csg-using-three-csgmesh
function CSGDemo(elementID) {
    var elem = document.getElementById(elementID)
    var camera = createCamera(elem);
    var renderer = createRenderer(elem);
    elem.appendChild(renderer.domElement);

    window.addEventListener('resize', function () {
        renderer.setSize(elem.clientWidth, elem.clientHeight);
        camera.aspect = elem.clientWidth/elem.clientHeight;
        camera.updateProjectionMatrix();
    }, false);

    var controls = createControls(camera, renderer);
    var scene = createScene();
    var light = createLight();
    var stlModel = "./static/stl_files/Coral Pen_No_Logo_Rounded.STL" //keystone.stl";
    var objModel = "./static/stl_files/female.obj";
    var vrmlModel = "./static/stl_files/bolt action pen honeycomb blank flat.wrl";
    var model = stlModel;

        loadSTL(model).then((geometry)=>{
            console.log(geometry);
            //geometry = applyDisplacementMap(geometry, 0., .5, renderer, scene, camera)
            var mesh = createObject(geometry);
            var exporter = new THREE.OBJExporter();
            var str = exporter.parse( mesh ); // Export the scene
            var blob = new Blob( [str], { type : 'text/plain' } ); // Generate Blob from the string
            saveAs( blob, 'file.obj' );
            scene.add(light,mesh);
            centerObject(geometry, camera, mesh);

            var animate = function () {
                requestAnimationFrame(animate);
                controls.update();
                renderer.render(scene, camera);
            };
            animate();
            });



}



