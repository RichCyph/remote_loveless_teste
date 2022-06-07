
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

    var material = new THREE.MeshPhongMaterial({
        color: 0xff5533,
        specular: 100,
        shininess: 100,
        wireframe:true

    });
    let mesh = new THREE.Mesh(geometry, material);
    return mesh

}
function createBeveledObject(geometry){
      const displacementScale = 5;
  // Create material
  const textureLoader = new THREE.TextureLoader();
  const texture = textureLoader.load(
    'https://i.imgur.com/TQAOVkU.jpeg'
  );
  //texture.repeat.set(2.5, 2.5);
  //texture.offset.set(-0.99,-0.99);
 // texture.offset.set(0.,-1.);
  const material = new THREE.MeshPhongMaterial({
    //map:texture,
    normalMap: texture,
    //normalScale: new THREE.Vector2(1,1),
    displacementMap:texture,
    displacementScale: displacementScale,
    displacementBias: -displacementScale,
    //shading:THREE.SmoothShading,
    //bumpMap: texture,
    //bumpScale: 1.0,
    specular: new THREE.Color("rgb(255,113,0)"),
    wireframe:true,
    color: 'red'
  });

  //var subdiv = 4;
  //var modifier = new THREE.SubdivisionModifier( subdiv );
  //modifier.modify( geometry );
  //geometry.mergeVertices();
  let mesh = new THREE.Mesh(geometry, material);
  //mesh.mergeVertices();
 // geometry.computeFaceNormals();
  //mesh.computeVertexNormals();
  //
return mesh;

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

function modifyGeometry(mesh){
    console.log(mesh);
    var origCsg	= THREE.CSG.toCSG(mesh);
    console.log(origCsg);
    var material = new THREE.MeshPhongMaterial({
        color: 0xff5533,
        specular: 100,
        shininess: 100,
        wireframe:true

    });
    var intersectingCube = THREE.Mesh(new THREE.CubeGeometry( 12, 40, 12 ), material);
    console.log(intersectingCube);
    var intersectingCsg = THREE.CSG.toCSG(intersectingCube);
    console.log(intersectingCsg);
    var substractedCsg = origCsg.subtract(intersectingCsg);
    console.log(substractedCsg);
    origCsg = THREE.CSG.fromCSG(substractedCsg);
    console.log(origCsg);
    return origCsg;
}

function applyDisplacementMap(geometry, minHeight, maxHeight, renderer, scene, camera) {
    const geoBefore = geometry;

   // (new THREE.TextureLoader()).load( "https://i.imgur.com/TQAOVkU.jpeg",
//	function ( heightMap ) {
	    //console.log(heightMap);
	    var canvas = document.getElementById('imageCanvas');
        var context = canvas.getContext('2d');
        var imageObj = new Image();
        imageObj.crossOrigin = "Anonymous"

        imageObj.src =  'https://i.imgur.com/TQAOVkU.jpeg'
        //'https://i.imgur.com/TQAOVkU.jpeg';
       // console.log(context.getImageData(0,0,canvas.width,canvas.height));
      // imageObj.onloadstart = function() {console.warn("start")}
      // imageObj.onload = function() {console.warn("loading")}
       //imageObj.onloadend = function() {console.warn("end")}
        imageObj.onload = function() {
           // var canvas = document.getElementById('imageCanvas');
          //  var context = canvas.getContext('2d');//for some reason I need to redfine this
            context.drawImage(imageObj, 0,0,100,100);

          //  console.log(context.getImageData(0,0,canvas.width,canvas.height));
            //heightMap.needsUpdate = true;

        //render();
      //  heightMap.wrapS = canvasTexture.wrapT = THREE.RepeatWrapping;
        //heightMap.repeat.set(1,1);

            var uvs = geometry.attributes.uv.array;
            var positions = geometry.attributes.position.array;
            var normals = geometry.attributes.normal.array;
            var position = new THREE.Vector3();
            var normal = new THREE.Vector3();
            var uv = new THREE.Vector2();
            var width = 100;//heightMap.image.width;
            var height = 100;//heightMap.image.height;

            var buffer = context.getImageData(0, 0, 100,100).data;
            console.log(buffer);
            for(var index = 0; index < positions.length; index+=3) {
                position.fromArray(positions,index);
                normal.fromArray(normals,index);
                uv.fromArray(uvs,(index/3)*2);
                var u = ((Math.abs(uv.x)*width)%width) | 0;
                var v = ((Math.abs(uv.y)*height)%height) | 0;
                var pos = (u+v*width) * 4;

                var r = buffer[pos] / 255.0;
                var g = buffer[pos + 1] / 255.0;
                var b = buffer[pos + 2] / 255.0;
                var gradient = r * 0.33 + g * 0.33 + b * 0.33;

                normal.normalize();
                //normal.multiplyScalar((minHeight + (maxHeight - minHeight) * (1.-gradient)));
                normal.multiplyScalar(-(minHeight + (maxHeight - minHeight) * (1.-gradient)));
                position = position.add(normal);
                position.toArray(positions, index);
            }
            geometry.attributes.position.array = positions;
            geometry.needsUpdate = true;
            geometry.verticesNeedUpdate = true;
            renderer.render(scene, camera);

            const mesh = createObject(geometry);
            //mesh = modifyGeometry(mesh);
            scene.add(createLight(),mesh);
            centerObject(geometry, camera, mesh);
            renderer.render(scene, camera);
            console.log(geometry == geoBefore);
            var exporter = new THREE.OBJExporter();
            var str = exporter.parse( mesh ); // Export the scene
            var blob = new Blob( [str], { type : 'text/plain' } ); // Generate Blob from the string
            saveAs( blob, 'file.obj' );
        };
        //https://discourse.threejs.org/t/csg-with-buffergeometry-three-r125/23735
        //http://jsfiddle.net/y7rQh/1/
   // });

    return geometry;
}

function twist(geometry){
    console.log(geometry);
    console.log(geometry.vertices);
    console.log(geometry.isBufferGeometry);
    const positions = geometry.attributes.position.array;
    console.log(positions);
    const quaternion = new THREE.Quaternion();
    const twistAmount = 10;
    const upVec = new THREE.Vector3(0, 1, 0);
    const textureLoader = new THREE.TextureLoader();
  const texture = textureLoader.load(
    'https://i.imgur.com/TQAOVkU.jpeg'
  );
  console.log(texture);
  for (let i = 0; i < positions.length; i+=3) {

    const v = new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2]);
    const yPos = v.y;
   // quaternion.setFromAxisAngle( upVec,  (yPos / twistAmount));
    //v.applyQuaternion(quaternion);
    v.z += Math.sin(v.y*Math.PI/10.)*3.;
    positions[i] = v.x;
    positions[i+1] = v.y;
    positions[i+2] = v.z;

  }
  console.log(positions);
  geometry.attributes.position.array = positions;
  geometry.verticesNeedUpdate = true;
  return geometry;
}
//create world
let renderer,camera,scene,stlObject,light;
function createWorld(){

}
//main

function STLViewer(model, elementID) {
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
    var useLoader = 1;

    if(useLoader == 1){
        loadSTL(model).then((geometry)=>{
            console.log(geometry);
            //geometry = applyDisplacementMap(geometry, 0., .5, renderer, scene, camera)
            var mesh = createObject(geometry);
            scene.add(light,mesh);
            centerObject(geometry, camera, mesh);

            var animate = function () {
                requestAnimationFrame(animate);
                controls.update();
                renderer.render(scene, camera);
            };
            animate();
            });

    }else{
        const scale = 20;
        const Vs = 100;
        var geometry = new THREE.CylinderGeometry( 5, 5, 20, 100,100);//new THREE.BoxGeometry(scale, scale, scale, Vs, Vs, Vs);
       //geometry =
        //twist(geometry);
        var geoBefore = geometry;
        geometry = applyDisplacementMap(geometry, 0., .5, renderer, scene, camera)


        const mesh = createObject(geometry);

        scene.add(light,mesh);

        /*let meshA = new THREE.Mesh(new THREE.BoxGeometry(1,1,1));
        let meshB = new THREE.Mesh(new THREE.BoxGeometry(1,1,1));
        scene.add(CSG.toMesh(CSG.subtract(CSG.fromMesh(meshA),CSG.fromMesh(meshB)),meshA.material));*/
        //var exporter = new THREE.STLExporter();
        centerObject(geometry, camera, mesh);

        var animate = function () {
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        };
        animate();
    };

}



