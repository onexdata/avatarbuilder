var camera, cameraVR;
var scene;
var meshHead, meshBody;
var matBody;
var headAtlas;
var light;
var objFacial = {}; //All facial expressions
var objEyes = {};
var clothes = {};
var texBody = new Array(4);
var skeleton;
var canvas = document.getElementById("canvas");
var previousExpIdx = 0;
var concrete = null;
var start = true;
var shadowGenerator;
var offsetZ = 7;
var blnVRmode = true;

//WebGL test
if (!BABYLON.Engine.isSupported()) {
    $("body").append("<h1>webGL is not enabled on this browser</h1><h2>Please edit your browser settings to enable webGL</h2>");	
}
var engine = new BABYLON.Engine(canvas, true);
scene = new BABYLON.Scene(engine);
scene.clearColor = new BABYLON.Color4(0,0,0,0);

//Load scene
BABYLON.SceneLoader.ShowLoadingScreen = false;
BABYLON.SceneLoader.CleanBoneMatrixWeights = true;
BABYLON.SceneLoader.Append("assets/", "morphs.babylon", scene, function (newMeshes) {
    meshHead = scene.getMeshByName("Head");
    meshBody = scene.getMeshByName("Body");

    skeleton = scene.getSkeletonByName("Armature");
    skeleton.beginAnimation("Walk",true);
    objEyes.left = new Eye(skeleton.bones[skeleton.getBoneIndexByName("Eye.L")]);
    objEyes.right = new Eye(skeleton.bones[skeleton.getBoneIndexByName("Eye.R")]);
    matHeadAtlas = scene.getMaterialByName("matAtlas");
    headAtlas = matHeadAtlas.diffuseTexture;
    setupMaterials();
    setupSkin();        
    setupLighting();
    setupRunway();
    setupShadows();
    setupCamera();
    BABYLON.SceneLoader.ImportMesh("","assets/", "animations.babylon", scene, function(skelMesh) {
        skeleton.copyAnimationRange(skelMesh[0].skeleton, "Walk");
        scene.skeletons.splice(1,1);
        skeleton.beginAnimation("Walk",true);
        setupMorphTargets();        
        scene.registerBeforeRender(function() {
            objEyes.left.rotate();
            objEyes.right.rotate();
        });
        startAllExpressions();
        startBlinking();
        meshBody.registerAfterRender(function() {
            if (start) {
                $("#loading").hide();
                $("#canvas").css("background-image","none");
                start = false;
                blnVRmode = false;
                $("#VR").css("opacity",1);
            }
        });
        engine.runRenderLoop(function() {
            concrete.vOffset -= 0.03;
            scene.render();
        });         
    });
});

function enableVR() {
    if (!blnVRmode) {
        $("#VR").css("opacity",0.1);
        engine.setHardwareScalingLevel(0.25);        
        camera.detachControl(canvas);
        cameraVR.attachControl(canvas, true);
        scene.activeCamera = cameraVR;

        var runwayBox = scene.getMeshByName("box");
        runwayBox.position.z += offsetZ;
        var runway = scene.getMeshByName("runway");
        runway.position.z += offsetZ;
        meshHead.position.z += offsetZ;
        meshBody.position.z += offsetZ;
        var eyeLeft = scene.getMeshByName("EyeLeft");
        var eyeRight = scene.getMeshByName("EyeRight");
        eyeLeft.position.z += offsetZ;
        eyeRight.position.z += offsetZ;    
        clothes.top1.position.z += offsetZ;
        clothes.shorts1.position.z += offsetZ;
        clothes.top2.position.z += offsetZ;
        clothes.shorts2.position.z += offsetZ;
    }    
}

function setupLighting() {
    light = new BABYLON.DirectionalLight("dir", new BABYLON.Vector3(-0.2, -2, 1.5), scene);
    light.position = new BABYLON.Vector3(-5, 30, -15);    
}

function setupRunway() {
    var runwayBox = BABYLON.Mesh.CreateBox("box", 2, scene);
    runwayBox.scaling = new BABYLON.Vector3(3,1,10);
    runwayBox.material = new BABYLON.StandardMaterial("matBox");
    runwayBox.position.y = -6;
    runwayBox.material.emissiveColor = new BABYLON.Color3(0.7,0.7,0.7);

    runway = BABYLON.MeshBuilder.CreatePlane("runway", {width: 6, height: 20}, scene);
    runway.rotate(BABYLON.Axis.X, Math.PI/2);
    runway.position.y = -4.99;
    runway.material = new BABYLON.StandardMaterial("matCatwalk");

    var skybox = BABYLON.Mesh.CreateBox("skyBox", 100.0, scene);
    var skyboxMaterial = new BABYLON.StandardMaterial("skyBox", scene);
    skyboxMaterial.backFaceCulling = false;
    skyboxMaterial.disableLighting = true;
    skyboxMaterial.alpha = 0.1;
    skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture("assets/environment.dds", scene);
    skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
    skybox.material = skyboxMaterial;

    concrete = new BABYLON.Texture("assets/concrete.jpg", scene);
    runwayBox.material.diffuseTexture = concrete.clone("concrete2");
    runwayBox.material.diffuseTexture.uScale = 0.2;
    runway.material.diffuseTexture = concrete;
    concrete.vScale = 3.33;
}

function setupMorphTargets() {
    //Create all facial expression objects
    Facial.blinkTarget = meshHead.morphTargetManager.getTarget(0);
    objFacial.squint = new Facial("Squint", meshHead.morphTargetManager.getTarget(0),0.2);
    objFacial.pout = new Facial("Pout", meshHead.morphTargetManager.getTarget(1),0.7);
    objFacial.smile = new Facial("Smile", meshHead.morphTargetManager.getTarget(2),0.5);
}

function setupShadows() {
    shadowGenerator = new BABYLON.ShadowGenerator(1024, light);
    shadowGenerator.getShadowMap().renderList.push(scene.getMeshByName("Body"));
    shadowGenerator.getShadowMap().renderList.push(scene.getMeshByName("Head"));
    shadowGenerator.getShadowMap().renderList.push(scene.getMeshByName("Shorts1"));
    shadowGenerator.getShadowMap().renderList.push(scene.getMeshByName("Shorts2"));
    shadowGenerator.useBlurExponentialShadowMap = true;
    shadowGenerator.useKernelBlur = true;
    shadowGenerator.blurKernel = 10;
    shadowGenerator.setDarkness(0.9);
    runway.receiveShadows = true;
}

function setupMaterials() {
    //Eyes
    var matEyeLeft = scene.getMeshByName("EyeLeft").material;
    var matEyeRight = scene.getMeshByName("EyeRight").material;
    var eyeEmissive = new BABYLON.Color3(0.5,0.5,0.5);
    var eyeSpecular = new BABYLON.Color3(0.3,0.3,0.3);
    
    matEyeLeft.emissiveColor = eyeEmissive;
    matEyeRight.emissiveColor = eyeEmissive;
    matEyeLeft.specularColor = eyeSpecular;
    matEyeRight.specularColor = eyeSpecular;    
/*
    var glass = new BABYLON.PBRSpecularGlossinessMaterial("pbr", scene);
    glass.environmentTexture = BABYLON.CubeTexture.CreateFromPrefilteredData("assets/environment.dds", scene);
    glass.alpha = 0;
    glass.glossiness = 0.4;
    glass.specularColor = new BABYLON.Color3(0.5,0.5,0.5);
    matEyeLeft.subMaterials[1] = glass;
    matEyeRight.subMaterials[1] = glass;
  */  
    //Clothes
    clothes.top1 = scene.getMeshByName("Top1");
    clothes.shorts1 = scene.getMeshByName("Shorts1")
    clothes.top2 = scene.getMeshByName("Top2");
    clothes.shorts2 = scene.getMeshByName("Shorts2")

    var matClothes = {
        top1:clothes.top1.material,
        shorts1:clothes.shorts1.material,
        top2:clothes.top2.material,
        shorts2:clothes.shorts2.material
    }
    
    var texClothes = new Array(4);
    var textureClothes = new BABYLON.Texture("assets/clothes_atlas.jpg", scene, true, true, 3, function() {                
        var i = 0;    
        for(var w = 0; w < 2; ++w) {
            for(var h = 0; h < 2; ++h) {
                var partTexture = textureClothes.clone("partTexture"+i);
                partTexture.uScale = 0.5;
                partTexture.vScale = 0.5;
                partTexture.uOffset = w/2;
                partTexture.vOffset = h/2;
                texClothes[i] = partTexture;
                i++;
            }
        } 
        matClothes.top1.diffuseTexture = texClothes[1];
        matClothes.shorts1.diffuseTexture = texClothes[3];
        matClothes.top2.diffuseTexture = texClothes[0];
        matClothes.shorts2.diffuseTexture = texClothes[2];
    });

    //Body
    matBody = {
        ponytail:meshBody.material.getSubByName("morphs.ponytail"),
        teeth:meshBody.material.getSubByName("morphs.teeth"),
        eyelashes:meshHead.material.getSubByName("morphs.Eyelashes"),
        eyeLeft:matEyeLeft.getSubByName("morphs.Eye_blue"),
        eyeRight:matEyeRight.getSubByName("morphs.Eye_blue")
    }
    i = 0;    
    for(var w = 0; w < 2; ++w) {
        for(var h = 0; h < 2; ++h) {
            var texture = new BABYLON.Texture("assets/body_atlas.png", scene, true, true, 3);                
            texture.uScale = 0.5;
            texture.vScale = 0.5;
            texture.uOffset = w/2;
            texture.vOffset = h/2;
            texBody[i] = texture;
            i++;
        }
    } 
    matBody.ponytail.diffuseTexture = texBody[0];    
    matBody.teeth.diffuseTexture = texBody[2];
    matBody.eyelashes.diffuseTexture = texBody[1];
    matBody.eyelashes.opacityTexture = texBody[1];
    matBody.eyeLeft.diffuseTexture = texBody[3];
    matBody.eyeRight.diffuseTexture = texBody[3];
}

BABYLON.Material.prototype.getSubByName = function(matName) {
    for (var i=0; i<this.subMaterials.length; i++) {
        if (this.subMaterials[i].name === matName) {
            return this.subMaterials[i];
        }
    }
    return null;
}

function setupSkin() {
    var matSkin = meshHead.material;
    var matCustom = new BABYLON.CustomMaterial("skin",scene);

    matCustom.AddUniform('texAtlas','sampler2D'); 
    matCustom.AddUniform('texUV','sampler2D'); 
    matCustom.AddUniform('percentPout','float');
    matCustom.AddUniform('percentSmile','float');
    matCustom.AddUniform('percentSquint','float');
    matCustom.Fragment_Definitions(`      
    vec4 getTextureFromAtlasMap(sampler2D txtRef_0,vec2 pos,vec2 vuv){

    vec2 size = vec2(2048.,2048.);
    vec2 SIZE = vec2(4096.,4096.);
    float uv_w = size.x / SIZE.x;  
    float uv_h = size.y / SIZE.y;   
    float uv_x = pos.x / SIZE.x ;    
    float uv_y = 1.- pos.y / SIZE.y -uv_h; 

    vec2 newUvAtlas = vec2( mod( vuv.x*uv_w, uv_w )+uv_x, mod(vuv.y*uv_h, uv_h)+uv_y  ); 
    vec4 color  = texture2D(txtRef_0 ,newUvAtlas.xy*vec2(1.,1.)+vec2(0.,0.));

    return color ;
    } `);
    matCustom.diffuseTexture = headAtlas;    
    matCustom.specularColor = new BABYLON.Color3(0.05,0.05,0.05);
    matCustom.emissiveColor = BABYLON.Color3.White();

        matCustom.onBindObservable.add(function () { 
        matCustom.getEffect().setTexture('texAtlas',headAtlas,scene);
        matCustom.getEffect().setFloat('percentPout',objFacial.pout.textureVal);
        matCustom.getEffect().setFloat('percentSmile',objFacial.smile.textureVal);
        matCustom.getEffect().setFloat('percentSquint',objFacial.squint.textureVal);
    });
    matCustom.Fragment_Before_FragColor(`
    vec4 colDefault = getTextureFromAtlasMap(texAtlas, vec2(0.,0.), vDiffuseUV);
    vec4 colPout = getTextureFromAtlasMap(texAtlas, vec2(0.,2048.), vDiffuseUV);
    vec4 colSmile = getTextureFromAtlasMap(texAtlas, vec2(2048.,2048.), vDiffuseUV); 
    vec4 colSquint = getTextureFromAtlasMap(texAtlas, vec2(2048.,0.), vDiffuseUV); 

    if (percentPout > percentSquint) {
        color = colPout*percentPout + (1.-percentPout)*colDefault;
    } else if (percentSmile > percentSquint) {
        color = colSmile*percentSmile + (1.-percentSmile)*colDefault;
    } else {
        color = colSquint*percentSquint + (1.-percentSquint)*colDefault;
    }
    `);
    matSkin.subMaterials[1] = matCustom;
    console.log("Shaders done");
}

function setupCamera() {
    cameraVR = new BABYLON.WebVRFreeCamera("camera", new BABYLON.Vector3(0, 2, 0), scene);
    camera = new BABYLON.ArcRotateCamera("ArcRotateCamera", 0, 0, 0, BABYLON.Vector3.Zero(), scene);
    camera.speed = .1;
    camera.lowerBetaLimit = 70 * Math.PI / 180;
    camera.upperBetaLimit = 100 * Math.PI / 180;
    camera.wheelPrecision = 250;
    camera.fov = 0.6;
    camera.lowerRadiusLimit = 10;
    //camera.lowerRadiusLimit = 15;
    camera.upperRadiusLimit = 30;
    camera.radius = 4;
    camera.panningAxis = new BABYLON.Vector3(0,1,0);
    camera.setPosition(new BABYLON.Vector3(0, 0, -25));
    camera.beta = 1.3;
    scene.activeCamera = camera;	
    camera.attachControl(canvas);
}

function changeClothes(item) {
    switch(item) {
        case "top1":
            clothes.top1.setEnabled(true);
            clothes.top2.setEnabled(false);
            break;
        case "top2":
            clothes.top2.setEnabled(true);
            clothes.top1.setEnabled(false);
            break;
        case "shorts1":
            clothes.shorts1.setEnabled(true);
            clothes.shorts2.setEnabled(false);
            break;
        case "shorts2":
            clothes.shorts2.setEnabled(true);
            clothes.shorts1.setEnabled(false);
            break;
    }
}

window.addEventListener("resize", function () {
    engine.resize();
});

window.addEventListener('focus', function() {
    startAllExpressions();
    startBlinking();
}); 

window.addEventListener('blur', function() {
    if (!start) {
        clearTimeout(Facial.blinkTimer);
        clearTimeout(Facial.blinkStepTimer);
        clearTimeout(Facial.timerExp);
        Facial.resetAll();
    }
});

$(function() {
    $("#HUDleft").on("pointerup", function(e) {
        triggerMouseEvent (canvas, "pointerup");
    })

    $("#canvas").on("pointerleave", function(e) {
        triggerMouseEvent (canvas, "pointerup");
        e.preventDefault();
    });
});
    
function triggerMouseEvent (node, eventType) {
    var clickEvent = document.createEvent ('MouseEvents');
    clickEvent.initEvent (eventType, true, true);
    node.dispatchEvent (clickEvent);
}

function startBlinking() {
    clearTimeout(Facial.blinkTimer);
    clearTimeout(Facial.blinkStepTimer);
    Facial.blinkTimer = setTimeout(function() {
        Facial.blink()
    },1000);                                
}

function startAllExpressions() {
    clearTimeout(Facial.timerExp);
    Facial.timerExp = setTimeout(function() {
        var randomNum = Math.random();
        var expIdx = Math.round(randomNum*10/2);
        if (previousExpIdx == expIdx) {
            expIdx++;
            if (expIdx > 4) expIdx = 0;
        }
        previousExpIdx = expIdx;
        
        switch(expIdx) {
            case 0:
                objFacial["pout"].startExpression();
                break;
            case 1:
                objFacial["squint"].startExpression(3000,function(){
                    Eye.bothY(0.1)
                },function(){
                    Eye.bothY(0);
                });
                break;
            case 2:
                objFacial["smile"].startExpression();
                break;
            case 3:
                Eye.bothX(0.15, true);
                break;
            case 4:
                Eye.bothX(-0.15, true);
                break;
        }
        startAllExpressions();
    }, (Math.random()+3) * 1000);
}

//Eye class
function Eye(bone) {
    this.bone = bone;
    this.angleX = 0;
    this.angleY = 0;
    this.currentX = 0;
    this.currentY = 0;
    this.greaterX = false;
    this.greaterY = false;
}

Eye.speed = 0.05;

Eye.bothX = function(angle, correct = false) {
    objEyes.left.setX(angle);
    objEyes.right.setX(angle);
    if (correct) {
        setTimeout(
            function() {
                objEyes.left.setX(0);
                objEyes.right.setX(0);
            }
        ,2000);
    }
}

Eye.bothY = function(angle, correct = false) {
    objEyes.left.setY(angle);
    objEyes.right.setY(angle);    
    if (correct) {
        setTimeout(
            function() {
                objEyes.left.setY(0);
                objEyes.right.setY(0);
            }
        ,2000);
    }
}

Eye.prototype.rotateX = function() {
    this.bone.rotate(BABYLON.Axis.Y, this.currentX);
    if (this.greaterX) {
        if (this.destX > this.currentX) this.currentX += Eye.speed;
    } else {
        if (this.destX < this.currentX) this.currentX -= Eye.speed;
    }
}

Eye.prototype.rotateY = function() {
    this.bone.rotate(BABYLON.Axis.X, this.currentY);
    if (this.greaterY) {
        if (this.destY > this.currentY) this.currentY += Eye.speed;
    } else {
        if (this.destY < this.currentY) this.currentY -= Eye.speed;
    }
}

Eye.prototype.rotate = function() {
    this.rotateX();
    this.rotateY();
}

Eye.prototype.setX = function(Xvalue) {
    this.destX = Xvalue;
    this.greaterX = this.destX > this.currentX;
}

Eye.prototype.setY = function(Yvalue) {
    this.destY = Yvalue;
    this.greaterY = this.destY > this.currentY;
}

//Facial expression class
function Facial (id, morphTarget, maxAmount) {
    this.morph = morphTarget;
    this.id = id;
    this.maxAmount = maxAmount;
    this.textureVal = 0;
    this.timer;
    this.wait;
    this.goingUp = true;
    this.timeHeld = 1000;
    this.onFinish = null;
}

Facial.blinkTarget = null;
Facial.blinkStepTimer = null;
Facial.blinkTimer = null;
Facial.blinkGoingUp = true;
Facial.blinkValue = 0;
Facial.busy = false;
Facial.squinting = false;
Facial.isBlinking = false;

Facial.resetAll = function() {
    objFacial.squint.reset();
    objFacial.smile.reset();
    objFacial.pout.reset();
}

Facial.blink = function() {
    if (!Facial.isBlinking) {
        if (!Facial.squinting) {
            if (Facial.blinkTarget !== null) {
                Facial.isBlinking = true;
                Facial.blinkValue = 0;
                Facial.blinkGoingUp = true;
                Facial.blinkStepTimer = setInterval(function() {
                    Facial.blinkStep();
                }, 20);        
            }
        }
        Facial.blinkTimer = setTimeout(function() {
            Facial.blink();
        }, (Math.random(1)+1)*1000);
    }
}

Facial.blinkStep = function() {     
    var step = 0.6;
    if (Facial.blinkGoingUp) {
        Facial.blinkValue += step;
        if (Facial.blinkValue >= 1) {
            Facial.blinkValue = 1;
            Facial.blinkGoingUp = false;
        }
    } else {
        Facial.blinkValue -= step;
        if (Facial.blinkValue < 0.0) {
            Facial.blinkValue = 0;
            clearTimeout(Facial.blinkStepTimer);
            Facial.blinkGoingUp = true;
            Facial.isBlinking = false;
        }
    }
    Facial.blinkTarget.influence = Facial.blinkValue;
}

Facial.prototype.reset = function() {
    $("#sli"+this.id).slider('value',0);
    this.clearTimers();
    this.textureVal = 0;
    this.morph.influence = 0;
}

Facial.prototype.clearTimers = function() {
    clearTimeout(this.wait);
    clearTimeout(this.timer);
    this.goingUp = true;
}

Facial.prototype.startExpression = function(timeHeld = 1000, onStart = null, onFinish = null) {
    Facial.resetAll();
    var _this = this;
    this.timeHeld = timeHeld;
    this.reset();
    Facial.busy = true;
    if (this.id === "Squint") {
        Facial.squinting = true;
    }
    if (onFinish !== null) {
        this.onFinish = onFinish;
    }
    if (onStart !== null) {
        onStart();
    }
    this.timer = setInterval(function() {
        _this.nextStep();
    }, 50);
}

Facial.prototype.nextStep = function() {     
    var step = 0.05;
    var currentValue = this.textureVal;
    var _this = this;
    if (this.goingUp) {
        currentValue += step;
        if (currentValue >= _this.maxAmount) {
            currentValue = _this.maxAmount;
            this.goingUp = false;
            clearTimeout(this.timer);
            this.wait = setTimeout(function() {
                _this.timer = setInterval(function() {
                    _this.nextStep();
                }, 15)
            },_this.timeHeld);
        }
    } else {
        currentValue -= step;
        if (currentValue <= 0.0) {
            this.goingUp = true;
            clearTimeout(this.timer);
            if (this.onFinish != null) {
                this.onFinish();
                this.onFinish = null;
            }
            Facial.busy = false;
            if (this.id === "Squint") {
                Facial.squinting = false;
            }
        }
    }
    this.textureVal = currentValue;
    this.morph.influence = currentValue;
}

$("#POlogo,.items ul li img").bind('touchend', function(e) {
  e.preventDefault();
  $(this).click();
});

document.addEventListener('touchmove', function(e) {
    e.preventDefault();
}, { passive: false });
