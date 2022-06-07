
/* Utility Functions */

/* Get ids with less code */
function id(id_name){
	return document.getElementById(id_name);
}

/* Get select element choices with less code */
function opt(id_name){
	let ui = id(id_name);
	return ui.options[ui.selectedIndex];
}

/* Get query selector all with less code */
function qAll(q){
	return document.querySelectorAll(q);
}

/* Show and hide our spinners */
function spinnerShow(){
	id("spinner").style.display = "flex";
	console.log("Spinner Shown");
}

function spinnerHide(){
	id("spinner").style.display = "none";
	console.log("Spinner Hidden");
}

/* A potential database structure */
const DATABASE = {
	coral_pen:{url:"coral_remesh_LinedUP_originCenter.obj", cutoff:33, polary_shift:0.80},
	bolt_pen:{url:"Bolt_Remesh_10_SMoothobj.obj", cutoff:33, polary_shift:0.90}
}

/* This function grabs our model data from the html. In production this function
can be altered to get the data from whereever you need! It is called everything
a model is initialized which happens once at the start and then everytime we switch models after that.*/
function getModelData(id_name){
	let choice = opt(id_name);
	let model_dict = {};
	model_dict.url = choice.value;
	model_dict.cutoff = choice.dataset.cutoff;
	model_dict.polary_shift = choice.dataset.polary_shift;
	return model_dict;
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

/* Returns a promise to load an image */
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

/* This is where our final model is exported */

function saveFile(mesh, exporter, file_name, file_type){
    var str = exporter.parse( mesh );
    var blob = new Blob( [str], { type : 'text/plain' } );
    saveAs( blob, file_name + file_type );
}

/* Cylindrical uvs for pen. */

function getUVs(geometry, yscale, yshift){
    let {position,uv,normal} = geometry.attributes;
	console.log(geometry.attributes);
    let uvs = uv.array;
    let ps = position.array;
    let uvCounter = 0;

    for(let i = 0; i < ps.length; i+=3){
        let polarX = (Math.atan2(ps[i+1]-yscale, ps[i])/Math.PI)*0.5+0.5;
        let polarY = (ps[i+2.])/60.+yshift;
        geometry.attributes.uv.array[uvCounter]= 1.-polarX;
        geometry.attributes.uv.array[uvCounter+1]= polarY;
        uvCounter+=2;
    }
    return geometry;
}

/* Color value from texture at each uv point on pen. */

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

/* Push pen verticies out along their normals based on texture value*/

function getPositions(geometry, minHeight, maxHeight, canvas, context, sign, cutoff_value){
	
    // let tmp_change_model = document.getElementById("change_model");
    /* Important, we grab a "cutoff" value from html data for the selected pen.
    We use this value to ensure we don't do any displacement beyond this point on
    the z axis (along the length of the pen). Otherwise it seems displacement
    just pops up in some places along the pen's lengt which is bad.*/
    // let cutoff_value = parseFloat(tmp_change_model.options[tmp_change_model.selectedIndex].dataset.cutoff);
	
    let uvs = geometry.attributes.uv.array;
    let positions = geometry.attributes.position.array;
    let normals = geometry.attributes.normal.array;
    let position = new THREE.Vector3();
    let normal = new THREE.Vector3();
    let uv = new THREE.Vector2();
    let width = canvas.width;
    let height = canvas.height;
	//context.translate(0, height);
	//context.scale(1.,-1.);
    const steps = 1 >>1;
    context.filter = `blur(${steps}px)`;
	
    let buffer = context.getImageData(0, 0, width,height).data;
    for(let index = 0; index < positions.length; index+=3) {
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
		/*
		//results in a hole being cut in our mesh but not in a good way really.
		var v = (((1.-Math.abs(uv.y))*height)%height) | 0;
		*/
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

function thraxNormals(geometry,canvas,context){

    //let canvas = document.getElementById('imageCanvas');
  //  let context = canvas.getContext('2d');
    let buffer = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let {position, uv, normal}=geometry.attributes;
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
     let rgb = getTextureAtUV(i,geometry,canvas,buffer);
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
    geometry.attributes.normal.needsUpdate = true;
    //let end_time = new Date().getTime();
    //document.getElementById("stats_normal_time").innerText = (end_time-start_time) +" ms";
    return geometry;
}


class World{
	/*
	
	Responsibilities: 
	- create the camera, renderer, light, orbitContorls, scene, resizer
	- updates the camera, light, scene, resizer
	- centers objects/camera positions
	- resizing
	- mode change
	- render scene!
	
	*/
	
	constructor(elementID, model){
		
		this.element = id(elementID)
		console.log(this.element);
		
		this.renderer = this.createRenderer(this.element );
		this.element.appendChild(this.renderer.domElement);
		console.log(this.renderer);
		
		this.camera = this.createCamera(this.element);
		console.log(this.camera);
		
		this.controls = this.createControls(this.camera,this.renderer);
		console.log(this.controls);
		
		this.light = this.createLight();
		console.log(this.light);
		this.camera.add(this.light);
		
		this.model = model;
		console.log(this.model);
		
		this.createScene();
		console.log(this.scene);
		
		this.mode = "A Mode";
	}
	
	/* Creation Functions */ 
	
	createRenderer(elem){
		let renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
		renderer.setSize(elem.clientWidth, elem.clientHeight);
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.PCFShadowmapping;
		
		console.log("Renderer Created!");
		return renderer;
	}
	
	createCamera(elem){
		var camera = new THREE.PerspectiveCamera(
		75, window.innerWidth / window.innerHeight, 0.1, 1000);
		console.log("Camera Created!");
		return camera;
		//return "A Camera"
	}
	
	createControls(camera,renderer){
		let controls = new THREE.OrbitControls(camera, renderer.domElement);
		controls.enableDamping = true;
		controls.rotateSpeed = 0.5;
		controls.dampingFactor = 0.1;
		controls.enableZoom = true;
		controls.autoRotate = false;
		controls.autoRotateSpeed = .75;
		console.log("Controls Created!");
		return controls;
		//return "Controls";
	}
	
	createMesh(geometry, material){
		mesh = new THREE.Mesh(geometry, material);
		return mesh;
	}
	
	createLight(){
		let directionalLight = new THREE.DirectionalLight( 0xFFFFFF, 0.9 );
		directionalLight.position.set(0.,1.,0.);
		directionalLight.castShadow = true;
		directionalLight.shadow.mapSize.width = 512;
		directionalLight.shadow.mapSize.height = 512;
		directionalLight.shadow.camera.near = 0.5;
		directionalLight.shadow.camera.far = 500;
		console.log("Lights Created!");
		return directionalLight;
		//return "A Light";
	}
	
	createScene(){
		
		this.updateScene();
		/* reset controls so centering works */
		this.controls.reset();
		/* We use update scene but then center the camera if it's a new scene.*/
		this.centerObject(this.model.geometry, this.camera, this.model.mesh);
		console.log("Scene Created!");
	}
	
	/* Update Functions */ 

	updateScene(){
		
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color('coral');
		
		this.mesh = this.model.mesh;//createMesh();
		this.scene.add(this.mesh, this.camera);

        let axesHelper = new THREE.AxesHelper( 15 );
        this.scene.add( axesHelper );
        let gridXZ = new THREE.GridHelper(40, 20);
        this.scene.add(gridXZ);

		console.log("Scene Updated!");
		
	}
	
	
	centerObject(geometry, camera){
		var middle = new THREE.Vector3();
		geometry.computeBoundingBox();
		geometry.boundingBox.getCenter(middle);
		
		var largestDimension = Math.max(geometry.boundingBox.max.x,
							geometry.boundingBox.max.y,
							geometry.boundingBox.max.z)
							
		camera.position.z = -largestDimension * 1.5; //geometry.boundingBox.max.z*1.5;
		camera.position.x = largestDimension * 1.5;  //geometry.boundingBox.max.z*1.5;//largestDimension * 1.5;
		camera.position.y = largestDimension * 1.5;
		
		console.log("Object Centered");
	}
	
	resize(renderer, camera, elem){
		renderer.setSize(elem.clientWidth, elem.clientHeight);
        camera.aspect = elem.clientWidth/elem.clientHeight;
        camera.updateProjectionMatrix();
		console.log("World Resized!");
	}
	
	/*  render */
	
	render(){
		this.controls.update();
        this.renderer.render(this.scene, this.camera);
		console.log("World Rendered!");
	}
	
}

class Canvas{
	/*
	Responsibilities: 
	- loads and stores a texture based on user input
	- draws the texture on the canvas
	- updates canvas based on settings triggers
	*/
	constructor(){
		
		this.canvas = document.getElementById('imageCanvas');
        this.context= this.canvas.getContext('2d');
		this.logo_url = "./static/images/apple_logo_white_bg.jpeg";//"https://i.imgur.com/TQAOVkU.jpeg";
		this.logo;
		//this.getTexture();
		
		/* These parameters are for changes to the logo */
		/* They need a starting value or some listeners get jammed */
        
		this.shift_x = 500.;// from settings
        this.shift_y = 500.;// from settings
        this.rotation = 0.;// from settings
        this.scale = 1.;// from settings
        this.scale_x = 1.;// from settings
        this.scale_y = 1.;// from settings
        //this.polarY_scale;// from settings
        //this.polarY_shift;// from settings
		
		console.log("Canvas Constructed!");
	}
	
	async getTexture(){
        this.logo = await loadTexture(this.logo_url);
		console.log("Logo Loaded");
		
		/* We make the first draw after the await and assume 
		no one will redraw milisecondss after construction...*/
		this.drawCanvas();
    }

	async changeLogo(e, url){
		this.logo_url = "./static/images/" + url;
		let that = this;//pre es6 method of using "this" in a promise
		await readUploadedImage(e).then(
		async function(result){
			that.logo_url = result;
			that.logo = await loadTexture(that.logo_url);
		});
		console.log(this.logo_url);
		await this.getTexture();
		console.log("Logo Changed");
	}
	
	drawCanvas(){
		let context = this.context;
		let canvas = this.canvas;
        context.save();
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.translate(this.shift_x, this.shift_y);
        context.rotate(this.rotation*(Math.PI/180.));
        context.scale(this.scale*this.scale_x, this.scale*this.scale_y);
        /*This blurring stage gives us more smoothing so better resolution*/
        const steps = 1 >> 2;
        context.filter = `blur(${steps}px)`;
        context.fillStyle = "#FFFFFF";
		 /*so we never go "off canvas" to black when scaling*/
        context.fillRect(-100000,-100000,10000000,10000000);
        context.drawImage(this.logo, -this.logo.width/2., -this.logo.height/2.);
        context.restore();
		console.log("Cavnas Drawn!");
	}
}

class Model{
	
	/*
	Number of Methods: 19
	responsibilities: 
	- loads and stores a model based on user input
	- creates and stores a clone of that model
	- Updates model clone based on settings triggers
		- updates normals
		- updates uvs
		- updates vertex positions
	*/
	
	constructor(canvas){
		this.canvas = canvas;
		
		this.model_url ="cube.obj";
		this.cutoff;
		this.polary_shift;
		
		console.log(this.model_url);
		
		this.import_type = this.getImportType();
        console.log(this.import_type);
		
		this.export_type =  opt("change_export_type").value;
		console.log(this.export_type);
		
		this.LOADERS = {
			obj:function(){return new THREE.OBJLoader()},
			stl:function(){return new THREE.STLLoader()},
			glb:function(){return new THREE.GLTFLoader()},
		}
		
		this.loader = this.LOADERS[this.import_type];
		console.log(this.loader);
		
		this.EXPORTERS = {
			obj:function(){return new THREE.OBJExporter()},
			stl:function(){return new THREE.STLExporter()},
			glb:function(){return new THREE.GLTFExporter()}
		}
		
		this.exporter = this.EXPORTERS["stl"];
		console.log(this.exporter);
		
		this.model;
		this.geometry;
		this.geometry_clone;
		this.editor_material;
		this.material;
		this.mesh;

		this.imprint_type = opt("change_imprint_type").value;
		console.log(this.imprint_type);
		
		this.imprint_depth = id("change_imprint_depth").value;
		console.log(this.imprint_depth);
		
		this.material_texture_url = './static/images/CustomUVChecker_byValle_1K.png';
		this.material_texture;// = "";//this.loadMaterialTexture(this.material_texture_url);		
		
		let textureLoader = new THREE.TextureLoader();
        let texture = textureLoader.load(
        './static/images/CustomUVChecker_byValle_1K.png'
        );
		
		this.MATERIALS = {
			basic:new THREE.MeshBasicMaterial( { color:"red" } ),
			standard:new THREE.MeshStandardMaterial( { color:"green" } ),
			lambert:new THREE.MeshLambertMaterial( { color:"blue" } ),
			textured:new THREE.MeshLambertMaterial( { map:texture} ),
			wireframe:new THREE.MeshLambertMaterial( { color:"purple" } ),
			normal:new THREE.MeshNormalMaterial()
		}
		
		this.material_choice = "lambert";
		
		console.log("MODEL CONSTRUCTED!");
	}
	
	getImportType(){
		return this.model_url.slice(this.model_url.length - 3.).toLowerCase();
	}
	

	loadModel(url) {
		return new Promise( (resolve, reject) => {
			/* this.loader() with brackets because the variable holds a call */
			this.loader().load(url, function (object) {
				resolve(object);
			});
		});
	}

	async initModel(){
		this.import_type = this.getImportType();
		this.loader = this.LOADERS[this.import_type];
		this.model = await this.loadModel("./static/stl_files/"+this.model_url, 
						   this.LOADERS[this.import_type]()).then((geo)=>{
						   return geo;});
						   
		/* Here we get the selected models info in a dictionary and set our variables.*/
		let model_dict = getModelData("change_model");
		this.cutoff = model_dict.cutoff;
		console.log(this.cutoff);
		this.polary_shift = model_dict.polary_shift;
		console.log(this.polary_shift);
		console.log("Model Data Retrieved!");
		console.log(this.model);
		
		this.geometry = this.getGeometry();
		this.geometry = THREE.BufferGeometryUtils.mergeVertices( this.geometry, 0.001 );
		this.updateUVs();
		/* make sure to set uvs on the true geo since we keep cloning it. */
		this.geometry_clone = this.geometry.clone();
		console.log(this.geometry_clone);
		
		
		this.material = this.MATERIALS[this.material_choice];
		this.editor_material = this.getEditorMaterial();
		console.log(this.editor_material);
		this.mesh = this.createMesh();
		console.log(this.mesh);
		//this.showEditorMaterial();
		
		console.log("Model Initialized!");
	}
	
	createGeometryClone(){
		console.log("Clone Created");
		return this.geometry.clone();
	}
	
	createMaterial(){
		const material = new THREE.MeshStandardMaterial( { color:"white" } );//map:this.material_texture } );
		console.log("Material Created!");
		return material;
	}
	
	getGeometry(){
		let geometry;
		
		if(this.import_type == 'obj'){
			geometry = this.model.children[0].geometry;
			console.log("get geometry from .obj");
        }
        else if(this.import_type == 'glb'){
			
			console.log(this.model);
			console.log(this.model.scene);
			//console.log(this.model.scene.children[3]);
			//console.log(this.model.scene.children[3].geometry);
			console.log("get geometry from .glb");
			if(this.model.scene.children.length > 1){
			geometry = this.model.scene.children[1].children[0].geometry;
			}
			else{
			geometry = this.model.scene.children[0].children[0].geometry;	
			}
		}
		else if(this.import_type == 'stl'){
			geometry = this.model;
			console.log("get geometry from .stl");
		}
		
		console.log("Getting model geometry / Geometr Created");
		return geometry;
	}
	
	async loadMaterialTexture(url){
		console.log("Loaded material texture!");
		return await loadTexture(url);
	}
	
	createMesh(){
		
		if(this.imprint_type == "no_imprint"){
			this.mesh = new THREE.Mesh(this.geometry_clone, this.editor_material);
		}
		else{
			this.mesh = new THREE.Mesh(this.geometry_clone, this.material);
		}
		this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
		return this.mesh;
	}
	
	async changeModel(url){
		
		this.model_url = url;
		await this.initModel();
		this.updateGeometry();
		/* If we are looking at a new model,
		let's not automatically add the displacement */
		// this.imprint_type = "no_imprint";
	    this.createMesh();
	}
	
	changeMaterial(name){
		this.material_choice = name;
		this.material = this.MATERIALS[this.material_choice];
		this.createMesh();
	}
	
	getEditorMaterial(){
		let tx = new THREE.CanvasTexture(this.canvas.context.canvas );
		tx.flipY = false;
		//editor_material.wrapS = THREE.RepeatWrapping;
		//editor_material.repeat.x = -1;
		let editor_material = new THREE.MeshStandardMaterial({ map: tx });
		
		
		return editor_material;
	}
	
	showEditorMaterial(){
		this.mesh.material = this.editor_material;
		console.log("Editor Material Shown!");
	}
	
	hideEditorMaterial(){
		if(this.imprint_type != "no_imprint"){
			console.log("Hideing because..."+this.imprint_type);
			this.mesh.material = this.material;
			console.log("Editor Material Hidden!");
		}
	}
	
	updateEditorMaterial(){
		this.editor_material = this.getEditorMaterial();				   
		console.log("Editor Material updated");
	}
	
	changeImprintType(name){
		this.imprint_type = name;
		this.updateGeometry();
		this.createMesh();
	}
	
	changeImprintDepth(depth){
		
		//console.log("the type");
		this.imprint_depth = depth;
		console.log(this.imprint_type);
		//if(this.imprint_type != "no_imprint"){
		this.updateGeometry();
		this.createMesh();
		//}
	}

	updateGeometry(){
		this.geometry_clone = this.geometry.clone();
		console.log(this.geometry_clone);
		
		if(this.import_type != "stl" && this.imprint_type != "no_imprint"){
			
			this.updateNormals(this.geometry_clone);
			this.updateVertices(this.geometry_clone);
			this.geometry_clone.attributes.position.needsUpdate = true;
			this.geometry_clone.attributes.normal.needsUpdate = true;
			this.geometry_clone.computeVertexNormals();
			console.log("Geometry Updated!");
		}
	}
	
	updateVertices(){
		let sign = -1.+(this.imprint_type=="emboss")*2.;
		let positions = getPositions(this.geometry_clone, 
									 0., this.imprint_depth,
                                     this.canvas.canvas, this.canvas.context, 
									 sign, parseFloat(this.cutoff)
									 );
		this.geometry_clone.attributes.position.array = positions;
		console.log("Vertices Updated");
	}
	
	updateUVs(){
		if(this.import_type != "stl" ){
			console.log(this.polary_shift);
			/* The polary_shift is a peice of data from the model that tells us
			how much to shift the model along the y axis when creating the uvs*/
			getUVs(this.geometry, 0., parseFloat(this.polary_shift));
			this.geometry.attributes.uv.needsUpdate = true;
			console.log("UVs Updated");
		}
	}

	updateNormals(geometry){
		console.log("Normals Updated");
		this.geometry_clone = thraxNormals(this.geometry_clone,this.canvas.canvas,this.canvas.context);
	}
	
	changeExportType(name){
		this.export_type = name;
	}
	
	exportModel(e){
		e.preventDefault();
		console.log("Exporting Model...");
		console.log(this.export_type);
		console.log(this.EXPORTERS[this.export_type]);
        saveFile(this.mesh, this.EXPORTERS[this.export_type](), 'file', '.' + this.export_type);
	}
	
	sendModel(){
		console.log("Sending Model To Backend");
	}
}

class Settings{
	
	/*
	Responsibilities: 
	
	- Take in objects (world,canvas,model)
	- Construct listeners for input objects
		- update call functions of those objects
		- update variables of those objects
	- construct listener for exporting objects
	- construct listener for posting object to server
	- listeners at most: change property, update canvas/model and recreate scene
	*/
	
	constructor(world,canvas,model){
		
		this.world=world;
		this.canvas=canvas;
		this.model=model;
		this.element = "A DOM Element";
		console.log(this.element);
		
		/* world listeners */
		
		/* canvas listeners*/
		
		qAll(".canvas_slider").forEach( function(item){
			
            item.addEventListener("input", function(e){
                id(item.dataset.span_id).innerText = item.value;
                canvas[item.dataset.setting] = id(item["id"]).value;
                canvas.drawCanvas();
				model.updateEditorMaterial();
				//model.createMesh();
				model.showEditorMaterial();
				//no need to use update scene 
            });
			
			/* On mouse up switch back to the usual material 
			for viewing the object */
            item.addEventListener("mouseup", function(e){
			   model.updateGeometry();
			   model.createMesh();
			   model.hideEditorMaterial();
			   world.updateScene(); 
			   //we have created a new mesh but it isn't in our scene
			   console.log("Slider Mouse Up!");
            });
			
            /* With mobile, when user stops touching the slider, 
			switch back to the usual material for viewing the 
			object */
            item.addEventListener("touchend", function(e){
			   model.updateGeometry();
			   model.createMesh();
			   model.hideEditorMaterial();
			   world.updateScene();
			  console.log("Slider Touch up");
            });
		});
		
		id("import_logo").addEventListener("change", async function(e){
			spinnerShow();
			await canvas.changeLogo(e, id("import_logo").value);
			model.updateEditorMaterial();
			model.updateGeometry();
			model.createMesh();//slow here is ok
			world.updateScene();//but we create a new mesh so update scene!
			spinnerHide();
			console.log("Model Changed!");
        });
		
		/* model listeners */
		
		id("change_model").addEventListener("change", async function(e){
			spinnerShow();
			await model.changeModel(opt("change_model").value);
			console.log("New Model Loaded");
			world.createScene();
			spinnerHide();
			console.log("Model Changed!");
        });
		
		id("change_imprint_type").addEventListener("change", function(e){
			spinnerShow();
			model.changeImprintType(opt("change_imprint_type").value);
			console.log(model.imprint_type);
			world.updateScene();
			spinnerHide();
			console.log("Imprint Type Changed!");
        });
		
		id("change_material").addEventListener("change", function(e){
			spinnerShow();
			model.changeMaterial(opt("change_material").value);
			console.log(model.material);
		    world.updateScene();
			console.log("Material Changed!");
			spinnerHide();
        });
		
		id("change_imprint_depth").addEventListener("change", function(e){
			spinnerShow();
			model.changeImprintDepth(id("change_imprint_depth").value);
			console.log(model.imprint_depth);
			world.updateScene();
			console.log("Imprint Depth Changed!");
			spinnerHide();
        });
			
		id("change_export_type").addEventListener("change", function(e){
			spinnerShow();
			model.changeExportType(opt("change_export_type").value);
			console.log(model.export_type);
			console.log("Export Type Changed Changed!");
			spinnerHide();
        });
		
		id("export_model").addEventListener("click", function(e){
			
			spinnerShow();
			model.exportModel(e);
			console.log("Model Exported!");
			e.preventDefault();
			spinnerHide();
        });
		
		id("send_model").addEventListener("click", function(e){
			spinnerShow();
			model.sendModel(e);
			console.log("Model Sent!");
			e.preventDefault();
			spinnerHide();
        });
		
		console.log("SETTINGS CONSTRUCTED!");
	}
}

async function second_demo_init() {
	
	let canvas = new Canvas();
	/* Needs to happen in an async function and 
	that can't be the constructor so...*/
	await canvas.getTexture();
	
	let model = new Model(canvas);
	/* Needs to happen in an async function and 
	that can't be the constructor so...*/
	await model.initModel(); 
	
	let world = new World("modelCanvas", model);
	
	canvas.drawCanvas();
	model.createMesh();
	model.updateEditorMaterial();
	model.showEditorMaterial();
	world.updateScene();
	
	let settings = new Settings(world, canvas, model);

	window.addEventListener('resize', function () {
            world.resize(world.renderer, world.camera, world.element);
        }, false);
	
	console.log("SECOND DEMO INITIALIZED!");
	
	//world.render();
	world.resize(world.renderer, world.camera, world.element);
	let animate = function () {
        requestAnimationFrame(animate);
        world.render();
    };

    animate();
	console.log(world.scene.background);
}

