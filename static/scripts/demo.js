
/* This function returns a promise to a loaded texture */
function loadTexture(url){
    return new Promise(resolve => {
        const image = new Image();
        image.addEventListener('load', () => {
            resolve(image);
        });
        image.crossOrigin = "Anonymous"
        image.src = url;
    });
}

/* this function returns a promise to a texture that has
   been loaded and read as an url */
function readUploadedImage(e){
    return new Promise(resolve => {
        const reader = new FileReader();
        reader.addEventListener('load', () => {
            resolve(reader.result);
        });
        reader.readAsDataURL(e.target.files[0]);
    });
}

/* this function maps textures to the loaded objects based on uv coordinates
   of the object */
function getTextureAtUV(index, geometry,canvas,buffer){
    let uvs = geometry.attributes.uv.array;
    let uv = new THREE.Vector2();
    uv.fromArray(uvs,(index/3)*2);
    let u = ((Math.abs(uvs[(index/3)*2])*canvas.width)%canvas.width) | 0;
    let v = ((Math.abs(uvs[(index/3)*2+1])*canvas.height)%canvas.height) | 0;
    let pos = (u+v*canvas.width) * 4;
    let r = buffer[pos] / 255.0;
    let g = buffer[pos + 1] / 255.0;
    let b = buffer[pos + 2] / 255.0;
    return (new THREE.Vector3(r,g,b));
}

/*
This function deals with the case where to faces have vertices
in teh exact same position but htey have different normals.
It separates all the verteces of an object
into bins based on their position (assuming overlapping vertices)
Then for each bin, it sets the normals of each vertex to the
average for that bin.
*/
function thraxNormals(boxGeom){
    //loading a context is slow so we do it here before the loop
    //and pass canvas and buffer into the gettextureAtUV function
    //let start_time = new Date().getTime();
    let canvas = document.getElementById('imageCanvas');
    let context = canvas.getContext('2d');
    let buffer = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let {position, uv, normal}=boxGeom.attributes;
    let vm = {}
    let getv3=(a,i)=>{
        return new THREE.Vector3(a[i],a[i+1],a[i+2])
    }

    let setv3=(a,i,v)=>{
      a[i]=v.x;
      a[i+1]=v.y;
      a[i+2]=v.z;
    }

    for(let i=0,a=position.array;i<a.length;i+=3){
     let rgb = getTextureAtUV(i,boxGeom,canvas,buffer);
      let v = getv3(a,i)
      let k = `${v.x},${v.y},${v.z}`
      if(!vm[k])vm[k]=[i]
      else vm[k].push(i)
    }

    let vsum = new THREE.Vector3();
    for(let k in vm){
      let vs = vm[k]

      for(let i=0;i<vs.length;i++){
        let vnormal = getv3(normal.array,vs[i])
        if(!i)vsum.copy(vnormal)
        else vsum.add(vnormal)
      }
      vsum.multiplyScalar(1./vs.length);
      for(let i=0;i<vs.length;i++){
        setv3(normal.array,vs[i],vsum)
      }
    }
    boxGeom.attributes.normal.needsUpdate = true;
    //let end_time = new Date().getTime();
    //document.getElementById("stats_normal_time").innerText = (end_time-start_time) +" ms";
    return boxGeom;
}

/*
This remaps the uvs for the objects to a cylindrical projection
along x and y. Turn a pen so the head faces you and all you see
is the circular outline. This 2d circle has an x and y. We take the atan2 of those
to give us an angle around the pen. This is our new "x". the 3rd dimention,
the length of the pen, is our new "y".
*/
function getUVs(geometry, yscale, yshift){
    //if(geometry.attributes == undefined)
    let start_time = new Date().getTime();
    let {position,uv,normal} = geometry.attributes;
    let uvs = uv.array;
    let ps = position.array;
    let uvCounter = 0;

    for(let i = 0; i < ps.length; i+=3){
        let polarX = (Math.atan2(ps[i+1]-yscale,ps[i])/Math.PI)*0.5+0.5;
        let polarY = (ps[i+2])/60+yshift;
        geometry.attributes.uv.array[uvCounter]=1.-polarX;
        geometry.attributes.uv.array[uvCounter+1]=polarY;
        uvCounter+=2;
    }
    let end_time = new Date().getTime();
    document.getElementById("stats_uv_time").innerText = (end_time-start_time) +" ms";
    return geometry;
}

/*
This function is where we deform the mesh.
We get the positions of each vertex, and use it to get the uv for
that vertex. We map that uv to our canvas which holds the texture and
use that to get a height between 0 and 1 for our displacement.
We then push the vertex up or down along it's normal path depending
on if we use emboss/deboss.
*/
function getPositions(geometry, minHeight, maxHeight, canvas, context, imageObj, sign){
    let tmp_change_model = document.getElementById("change_model");
    /* Important, we grab a "cutoff" value from html data for the selected pen.
    We use this value to ensure we don't do any displacement beyond this point on
    the z axis (along the length of the pen). Otherwise it seems displacement
    just pops up in some places along the pen's lengt which is bad.*/
    let cutoff_value = parseFloat(tmp_change_model.options[tmp_change_model.selectedIndex].dataset.cutoff);
    var uvs = geometry.attributes.uv.array;
    var positions = geometry.attributes.position.array;
    var normals = geometry.attributes.normal.array;
    var position = new THREE.Vector3();
    var normal = new THREE.Vector3();
    var uv = new THREE.Vector2();
    var width = canvas.width;
    var height = canvas.height;
    const steps = 1 >>1;
    context.filter = `blur(${steps}px)`;

    var buffer = context.getImageData(0, 0, width,height).data;
    for(var index = 0; index < positions.length; index+=3) {
        let rgb = getTextureAtUV(index, geometry, canvas, buffer);
            if((rgb.x + rgb.y + rgb.z) >= 2.999){
                continue;
            }
        position.fromArray(positions,index);
        if(position.z < -cutoff_value){
                continue;
            }
	/*
        if(Math.sqrt(position.x*position.x + position.y*position.y) < 5.5){
                continue;
            }
*/
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
        normal.multiplyScalar(sign*(minHeight + (maxHeight - minHeight) * (1.-gradient)));
        position = position.add(normal);

        position.toArray(positions, index);
    }
    return positions;
}

/*
this function doesn't actually apply the map but it calls
the function that does and provies all it's prarmeters including the canvas.
At the end it sets all the vertices to update and recomputes the normals.
If we don't recompute the normal the lighting wont work.
*/
function applyDisplacementMap(geometry, minHeight, maxHeight, sign, imageObj){
    let start_time = new Date().getTime();
	let canvas = document.getElementById('imageCanvas');
    let context = canvas.getContext('2d');
    let positions = getPositions(geometry, minHeight, maxHeight, canvas, context, imageObj,sign);
    geometry.attributes.position.array = positions;
    geometry.needsUpdate = true;
    geometry.verticesNeedUpdate = true;
    geometry.computeVertexNormals();
    let end_time = new Date().getTime();
    document.getElementById("stats_displacement_time").innerText = (end_time-start_time) +" ms";
    return geometry;
}

/*
This was where I was applying the cut-out function using constructive
geometry. Unfortunately it is too slow / too much work in the browser and results
in a crash with high polygon count objects.
*/
function applyCutoutMap(original_pen_model, displaced_pen_model){
    let bsp_original_pen_model = CSG.fromMesh(original_pen_model);
    let bsp_displaced_pen_model = CSG.fromMesh(displaced_pen_model);
    //let timeBefore = new Date().getTime();
    let bsp_peice = bsp_original_pen_model.intersect(bsp_displaced_pen_model);
    //let timeAfter = new Date().getTime();
    //let operationTime = timeAfter-timeBefore;
    document.getElementById("stats_csg_time").innerText = " " + operationTime + " ms";
    let bspResult = bsp_original_pen_model.subtract(bsp_peice);
    let mesh = CSG.toMesh(bspResult, original_pen_model.matrix, original_pen_model.material);
    return mesh;
}

/*
This world class is what ultimately holds all of the important
parameters for this project. It is send into another class called "Settings"
which updates it whenever there is a UI event.
It also holds the calls to most of the functions in the project in one way or another

*/
class World{

    constructor(elementID){
        /*
        All the important parameters are defined here
        */
        this.model;// our model lives here
        this.mold;
        this.import_type;//import type comes from the last three letters in the file name (obj or stl)
        this.export_type;// export type is user defined and is set in settings
        this.imprint_type; // from settings
        this.imprint_depth; /// from settings
        this.logo_url = 'https://i.imgur.com/TQAOVkU.jpeg';

        /* These parameters are for changes to the logo */
        this.shift_x;// from settings
        this.shift_y;// from settings
        this.rotation;// from settings
        this.scale;// from settings
        this.scale_x;// from settings
        this.scale_y;// from settings
        this.polarY_scale;// from settings
        this.polarY_shift;// from settings

        this.elem = document.getElementById(elementID);
        this.camera = createCamera(this.elem);
        this.renderer = createRenderer(this.elem);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap

        this.elem.appendChild(this.renderer.domElement);
        this.resizer = new Resizer(this.elem, this.camera, this.renderer);
        this.controls = createControls(this.camera, this.renderer);

        this.change_material = document.getElementById("change_material");
        this.materialName = this.change_material.options[this.change_material.selectedIndex].value;

        this.phongMaterial = new THREE.MeshNormalMaterial({
        color: 0xff5533,
        wireframe:false,
        });

        this.wireFrameMaterial = new THREE.MeshStandardMaterial({
        color: 0x377aa,
        wireframe:true
        });

        let textureLoader = new THREE.TextureLoader();
        let texture = textureLoader.load(
        './static/images/CustomUVChecker_byValle_1K.png'
        );

        this.texturedMaterial = new THREE.MeshLambertMaterial({
            map:texture,
        });

        this.materialDict = {

            phong:this.phongMaterial,
            textured:this.texturedMaterial,
            wireframe:this.wireFrameMaterial
            }

        this.material = this.materialDict[this.materialName];
        this.scene;
        this.lights;
        this.geometry;
        this.mesh;
        this.model_copy;
        this.animate;
    }

    /*
    This is the function we use to get a loaded texture.
    The function returns a promise to load the texture so we make the function async
    and call the function using await to prevent us from trying to move on
    before the texture is fully loaded */
    async getTexture(){
        this.logo = await loadTexture(this.logo_url);
        this.drawTexture();
    }


    drawTexture(){
        let canvas = document.getElementById('imageCanvas');
        let context = canvas.getContext('2d');

        context.save();
        context.clearRect(0, 0, canvas.width, canvas.height);

        /* Translation, Rotation and scaling need to be done in this order*/
        context.translate(this.shift_x, this.shift_y);
        context.rotate(this.rotation*(Math.PI/180.));
        /*Both a global scale and separate x/y scaling is applied here*/
        context.scale(this.scale*this.scale_x, this.scale*this.scale_y);

        /*This blurring stage gives us more smoothing so better resolution*/
        const steps = 1 >> 2;
        context.filter = `blur(${steps}px)`;

        /*The background color is set to white and filled with a very large
        rectangle. This is so that if the canvas is resized to be very small it is still large enough
        that we don't end up with an area wher there is no canvas color (black) but that
        is still being applied to our object. That would result in a deboss/emboss where we
        might not want one.*/
        context.fillStyle = "#FFFFFF";
        context.fillRect(-100000,-100000,10000000,10000000);
        context.drawImage(this.logo, -this.logo.width/2., -this.logo.height/2.);
        context.restore();
    }


    /*This is the function we use to get a loaded model
    The function returns a promise to load the object so we make the function async
    and call the function using await to prevent us from trying to move on
    before the texture is fully loaded*/
    async getGeometry(){

        /* Load the geometry */
        let geoStartTime = new Date().getTime();
        let model_url = "./static/stl_files/";
        if(this.import_type == 'obj' || this.import_type == 'stl' || this.import_type == 'glb'){
            this.geometry = await loadModel(model_url+this.model, LOADERS[this.import_type]()).then((geo)=>{
                return geo;
            });
            if(this.import_type == 'obj'){
                this.geometry = this.geometry.children[0].geometry;
            }
            else if(this.import_type == 'glb'){
                this.geometry = this.geometry.scene.children[0].children[0].geometry;
            }
        }//let geoModelLoadTime = new Date().getTime();
        else{
            let scale = 10; let Vs = 100;
            this.geometry = new THREE.BoxGeometry(scale, scale, scale, Vs, Vs, Vs);
        }

        /* End by merging unessesary vertices */
        this.geometry = THREE.BufferGeometryUtils.mergeVertices( this.geometry, 0.001 );
        //merge geometry before any other process and log it
        //let vertex_count = (this.geometry.attributes.position.array).length/3;
        //stats_original_vertex_count.innerText = " " + vertex_count;

        /* Create clone of the geometry so you don't have to reload the original
        every time you want to change something */
        this.model_clone = this.geometry.clone();
    }

    /* Manipulate a copy of that geometry so you can save the original. */
    async manipulateGeometry(){
        this.geometry = this.model_clone.clone();
        /*STL files do not hold uvs so we can't actually do much with them.
        The functionality for uploading  stls is there for testing only.
        if we are not using stl, we get the uvs via cylindrical projection
        and then the normals using thraxNormals function,.*/
        //console.log("Load Time: " + parseFloat((new Date().getTime())-geoStartTime));
        if(this.import_type != "stl"){
            this.geometry = getUVs(this.geometry,this.polarY_scale,this.polarY_shift);
            //console.log("UV Time: " + parseFloat((new Date().getTime())-geoStartTime));
            this.geometry = thraxNormals(this.geometry);
            //console.log("Normals Time: " + parseFloat((new Date().getTime())-geoStartTime));
        }

        /*If we are not in edit mode, (and not in cutout mode), we are either deboss or emboss*/
        if(this.geometry.attributes.uv != undefined
            && this.imprint_type != "no_imprint"
            && this.imprint_type != "Cutout" ){

            /*
            In the next line, "-1+(this.imprint_type=="emboss")*2," is a decision to either push the mesh out or in
            depending on if we are emboss or not (meaning deboss)
            For this one I need to say await even though it is also await in the function applydisplacementmap.
            */

            this.geometry = await applyDisplacementMap(
                                                    this.geometry, 0.,
                                                    this.imprint_depth,
                                                    -1+(this.imprint_type=="emboss")*2,
                                                    this.logo);

            /* We make sure to set everything we just created to update which may be a bit redundant. */
            this.geometry.attributes.position.needsUpdate = true;
            this.geometry.attributes.normal.needsUpdate = true;
            this.geometry.attributes.uv.needsUpdate = true;
            let geoDisplacementTime = new Date().getTime();
            //console.log("Displacement_time: " + parseFloat((new Date().getTime())-geoStartTime));
        }

        /* This function was for the cut out which is not being used at this time.
        The last attempted method which is below uses a cynider that acts as a hull around the pen.
        This hull would then be deformed and that deformation would intersect with the pen. The constructive
        geometry would have cut out the pen where this intersection existed.*/
        /*
        else if(this.geometry.attributes.uv != undefined
            && this.imprint_type == "Cutout"){

            this.mold = new THREE.CylinderGeometry(2, 2, 20, 20, 20, true );
            this.mold.rotateX((90/180)*Math.PI);
            this.mold = getUVs(this.mold,this.polarY_scale,this.polarY_shift);
            this.mold = thraxNormals(this.mold);
            //this.mold = await getDisplacedPart(this.mold, this.logo);
            this.mold = await applyDisplacementMap(this.mold, 0.,
                                                    this.imprint_depth, 2.*(-1+(this.imprint_type=="cutout")*2), this.logo);
            this.geometry.attributes.position.needsUpdate = true;
            this.geometry.attributes.normal.needsUpdate = true;
            this.geometry.attributes.uv.needsUpdate = true;
        }*/
    }

    /* We create our scene in an async function so we can use await when we load  */
    async createScene(){
        this.scene = createScene();
        this.lights = createLight();

        /* These variables are created for debugging purposes*/
        let numVertices = this.geometry.attributes.position.count;
        const modifier = new THREE.SimplifyModifier;
        let simplified_vertex_count = (this.geometry.attributes.position.array).length/3;
        let stats_name = document.getElementById("stats_name");
        let stats_original_vertex_count = document.getElementById("stats_original_vertex_count");
        let stats_simplified_vertex_count = document.getElementById("stats_simplified_vertex_count");
        let canvas = document.getElementById('imageCanvas');
        let context = canvas.getContext('2d');
        let debugTexture = new THREE.CanvasTexture(context.canvas);
        debugTexture.flipY=false;

        this.mesh = createObject(this.geometry, this.material);
        if(this.imprint_type == "no_imprint"){
            this.mesh.material = new THREE.MeshStandardMaterial( { map: debugTexture } );
        }
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;

        /*
        if(this.imprint_type == "Cutout"){
            console.log("we'll do out cutout here!");
            this.moldMesh = createObject(this.mold, this.material);
            this.mesh = await applyCutoutMap(this.mesh, this.moldMesh);
        }
        */

        stats_name.innerText = " " + this.model;
        stats_simplified_vertex_count.innerText = " " + simplified_vertex_count;
        this.scene.add(this.mesh,this.camera);
        const axesHelper = new THREE.AxesHelper( 15 );
        this.scene.add( axesHelper );
        var gridXZ = new THREE.GridHelper(100, 20);
        this.scene.add(gridXZ);
        centerObject(this.geometry, this.camera, this.mesh);
    }

   //needs to be asyncronous to use await on the applycutout
   async updateScene(){
        let timer = new Date().getTime();
        this.scene = createScene();
        this.lights = createLight();
        this.mesh = createObject(this.geometry, this.material);
        let canvas = document.getElementById('imageCanvas');
        let context = canvas.getContext('2d');
        let debugTexture = new THREE.CanvasTexture(context.canvas);
        debugTexture.flipY=false;
        if(this.imprint_type == "no_imprint"){
            this.mesh.material = new THREE.MeshStandardMaterial( { map: debugTexture } );
        }
        /*
        if(this.imprint_type == "Cutout"){
            //console.log("we'll do out cutout here!");
            this.moldMesh = createObject(this.mold, this.material);
            this.mesh = await applyCutoutMap(this.mesh, this.moldMesh);
        }*/
        this.mesh.castShadow = true; //default is false
        this.mesh.receiveShadow = true; //default
        this.scene.add(this.mesh,this.camera);
        const axesHelper = new THREE.AxesHelper( 15 );
        this.scene.add( axesHelper );
        var gridXZ = new THREE.GridHelper(100, 20);
        this.scene.add(gridXZ);
        //centerObject(this.geometry, this.camera, this.mesh);
        console.log("Displacement_time: " + parseFloat((new Date().getTime())-timer));
    }

    updateMaterial(materialName){
        this.material = this.materialDict[materialName];
    }

    exportGeometry(){
        console.log('here!')
        saveFile(this.mesh, EXPORTERS[this.export_type](), 'file', '.' + this.export_type);
    }

    render(){
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
};

class Settings{
    constructor(world){

        /* Here we collect from our html form, all the user defined settings */
        this.change_model = document.getElementById("change_model");
        this.import_logo = document.getElementById("import_logo");
        this.change_imprint_type = document.getElementById("change_imprint_type");
        this.change_imprint_depth = document.getElementById("change_imprint_depth");
        this.change_material = document.getElementById("change_material");
        this.change_export_type = document.getElementById("change_export_type");
        this.export_model = document.getElementById("export_model");
        this.logo = this.import_logo.value;
        this.change_shift_x = document.getElementById("change_shift_x");
        this.change_shift_y = document.getElementById("change_shift_y");
        this.change_rotation = document.getElementById("change_rotation");
        this.change_scale = document.getElementById("change_scale");
        this.change_scale_x = document.getElementById("change_scale_x");
        this.change_scale_y = document.getElementById("change_scale_y");

        /* Here we give the world object all of our setting parameters */
        world.model = this.change_model.options[this.change_model.selectedIndex].value;
        world.import_type = world.model.slice(world.model.length - 3).toLowerCase();
        world.export_type = this.change_export_type.options[this.change_export_type.selectedIndex].value;
        world.imprint_type = this.change_imprint_type.options[this.change_imprint_type.selectedIndex].value;
        world.imprint_depth = this.change_imprint_depth.value;
        world.materialName = this.change_material.options[this.change_material.selectedIndex].value;
        world.shift_x = this.change_shift_x.value;
        world.shift_y = this.change_shift_y.value;
        world.rotation = this.change_rotation;
        world.scale = this.change_scale.value;
        world.scale_x = this.change_scale_x.value;
        world.scale_y = this.change_scale_y.value;
        world.polarY_scale = parseFloat(this.change_model.options[this.change_model.selectedIndex].dataset.polary_scale);
        world.polarY_shift = parseFloat(this.change_model.options[this.change_model.selectedIndex].dataset.polary_shift);

        /* Here we grab our spinner element */
        this.spinner = document.getElementById("spinner");

        /* For each element of class slider we get it's span id using a data-item in this elements html.
        Then we use that to set the world parameter for that span bsed on the same data-item.
        What we are doing is adding a listener so that anytime the slider is moved, we
        display the logo on the object as a new material. As soon as the user releases the
        slider we swich the texture back.*/

        document.querySelectorAll(".slider").forEach( function(item){
            item.addEventListener("input", function(e){
                document.getElementById(item.dataset.span_id).innerText = item.value;
                world[item.dataset.setting] = document.getElementById(item["id"]).value;
                world.drawTexture();
                let canvas = document.getElementById('imageCanvas');
                let context = canvas.getContext('2d');
                let debugTexture = new THREE.CanvasTexture(context.canvas);
                debugTexture.flipY=false;
                world.mesh.material = new THREE.MeshStandardMaterial( { map: debugTexture, } );

            });
            /* On mouse up switch back to the usual material for viewing the object */
            item.addEventListener("mouseup", function(e){
                if(world.imprint_type != "no_imprint"){
                    world.mesh.material = world.material;
                }
            });
            /* With mobile, when user stops touching the slider, switch back to the usual material for viewing the object */
            item.addEventListener("touchend", function(e){
                if(world.imprint_type != "no_imprint"){
                    world.mesh.material = world.material;
                }
            });
        });

        /* Below are listeners for all of the other options in the user settings form.  */
        this.change_model.addEventListener("change", async function(e){
            document.getElementById("spinner").style.display = "flex";
            let tmp_change_model = document.getElementById("change_model");
            world.model = tmp_change_model.options[tmp_change_model.selectedIndex].value;
            world.polarY_scale = parseFloat(tmp_change_model.options[tmp_change_model.selectedIndex].dataset.polary_scale);
            world.polarY_shift = parseFloat(tmp_change_model.options[tmp_change_model.selectedIndex].dataset.polary_shift);
            world.import_type = world.model.slice(world.model.length - 3).toLowerCase();
            await world.getGeometry();
            await world.manipulateGeometry();
            world.createScene();
            world.render();
            document.getElementById("spinner").style.display = "none";
        });

        this.import_logo.addEventListener("change", async function(e){
            document.getElementById("spinner").style.display = "flex";

            world.logo_url = await readUploadedImage(e).then(
                async function(result){
                    world.logo_url = result;
                    world.logo = await loadTexture(world.logo_url);
                });
            world.drawTexture();
            if(world.imprint_type != "no_imprint"){
                //await world.getGeometry();
                await world.manipulateGeometry();
                world.updateScene();
                world.render();
            }
            document.getElementById("spinner").style.display = "none";
        });

        this.change_shift_x.addEventListener("change", async function(e){
            document.getElementById("spinner").style.display = "flex";
            world.shift_x = document.getElementById("change_shift_x").value;
            world.drawTexture();
            if(world.imprint_type != "no_imprint"){

                //await world.getGeometry();
                await world.manipulateGeometry();
            }
                world.updateScene();
                world.render();

            document.getElementById("spinner").style.display = "none";
        });

        this.change_shift_y.addEventListener("change", async function(e){
            document.getElementById("spinner").style.display = "flex";
            world.shift_y = document.getElementById("change_shift_y").value;
            world.drawTexture();
            if(world.imprint_type != "no_imprint"){
                //await world.getGeometry();
                await world.manipulateGeometry();
            }
                world.updateScene();
                world.render();

            document.getElementById("spinner").style.display = "none";
        });

        this.change_rotation.addEventListener("change", async function(e){
            document.getElementById("spinner").style.display = "flex";
            world.rotation = document.getElementById("change_rotation").value;
            world.drawTexture();
            if(world.imprint_type != "no_imprint"){

                //await world.getGeometry();
                await world.manipulateGeometry();
            }
                world.updateScene();
                world.render();

            document.getElementById("spinner").style.display = "none";
        });

        this.change_scale.addEventListener("change", async function(e){
            document.getElementById("spinner").style.display = "flex";
            world.scale = document.getElementById("change_scale").value;
            world.drawTexture();
            if(world.imprint_type != "no_imprint"){

                //await world.getGeometry();
                await world.manipulateGeometry();
            }
                world.updateScene();
                world.render();

            document.getElementById("spinner").style.display = "none";
        });

        this.change_scale_x.addEventListener("change", async function(e){
            document.getElementById("spinner").style.display = "flex";
            world.scale_x = document.getElementById("change_scale_x").value;
            console.log("change_scale x");
            world.drawTexture();
            if(world.imprint_type != "no_imprint"){

                //await world.getGeometry();
                await world.manipulateGeometry();
            }
                world.updateScene();
                world.render();

            document.getElementById("spinner").style.display = "none";
        });

        this.change_scale_y.addEventListener("change", async function(e){
            document.getElementById("spinner").style.display = "flex";
            world.scale_y = document.getElementById("change_scale_y").value;
            console.log("change_scale y");
            world.drawTexture();
            if(world.imprint_type != "no_imprint"){

                //await world.getGeometry();
                await world.manipulateGeometry();
            }
                world.updateScene();
                world.render();

            document.getElementById("spinner").style.display = "none";
        });

        this.change_imprint_type.addEventListener("change", async function(e){
            document.getElementById("spinner").style.display = "flex";
            let tmp_imprint_type = document.getElementById("change_imprint_type");
            world.imprint_type = tmp_imprint_type.options[tmp_imprint_type.selectedIndex].value;

            await world.manipulateGeometry();
            world.updateScene();

            world.render();
            document.getElementById("spinner").style.display = "none";
        });

        this.change_imprint_depth.addEventListener("change", async function(e){
            document.getElementById("spinner").style.display = "flex";
            world.imprint_depth = document.getElementById("change_imprint_depth").value;

            if(world.imprint_type != "no_imprint"){
                //await world.getGeometry();
                await world.manipulateGeometry();
                world.updateScene();
                world.render();
            }
            document.getElementById("spinner").style.display = "none";
        });

        this.change_export_type.addEventListener("change", function(e){
            document.getElementById("spinner").style.display = "flex";
            let tmp_export_type = document.getElementById("change_export_type");
            world.export_type = tmp_export_type.options[tmp_export_type.selectedIndex].value;
        });

        this.change_material.addEventListener("change", async function(e){
            document.getElementById("spinner").style.display = "flex";
            let tmp_change_material = document.getElementById("change_material");
            world.materialName = tmp_change_material.options[tmp_change_material.selectedIndex].value;
            world.updateMaterial(world.materialName);

            //await world.getGeometry();
            await world.manipulateGeometry();
            world.updateScene();
            world.render();
            document.getElementById("spinner").style.display = "none";
        });

        this.export_model.addEventListener("click", function(e){
            document.getElementById("spinner").style.display = "flex";
            world.exportGeometry();
            document.getElementById("spinner").style.display = "none";
            e.preventDefault();
        });
        this.world = world;
    }
};

/* This is our initialization function which is triggered in
   the html file. It creates:
   The World Object
   The Settings Object
   A resize listener

  Then it set's up the scene for the first time and animates.
*/
async function init(elementID) {

    let world = new World(elementID);
    let settings = new Settings(world);

    window.addEventListener('resize', function () {
            world.renderer.setSize(world.elem.clientWidth, world.elem.clientHeight);
            world.camera.aspect = world.elem.clientWidth/world.elem.clientHeight;
            world.camera.updateProjectionMatrix();
        }, false);

    await world.getTexture();
    await world.getGeometry();
    await world.manipulateGeometry();
    world.createScene();


    let animate = function () {
        requestAnimationFrame(animate);
        world.render();
    };

    animate();

}