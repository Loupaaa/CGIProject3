import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from '../../libs/utils.js';
import { length, flatten, inverse, mult, normalMatrix, perspective, lookAt, vec4, vec3, vec2, subtract, add, scale, rotate, normalize, translate } from '../../libs/MV.js';

import * as dat from '../../libs/dat.gui.module.js';

import * as CUBE from '../../libs/objects/cube.js';
import * as SPHERE from '../../libs/objects/sphere.js';
import * as CYLINDER from '../../libs/objects/cylinder.js';
import * as TORUS from '../../libs/objects/torus.js';
import * as BUNNY from '../../libs/objects/bunny.js';

const MAX_LIGHTS = 8;

function setup(shaders) {
    const canvas = document.getElementById('gl-canvas');
    const gl = setupWebGL(canvas);

    CUBE.init(gl);
    SPHERE.init(gl);
    CYLINDER.init(gl);
    TORUS.init(gl);
    BUNNY.init(gl);

    const program = buildProgramFromSources(gl, shaders['shader.vert'], shaders['shader.frag']);

    let camera = {
        eye: vec3(0, 5, 10),
        at: vec3(0, 0, 0),
        up: vec3(0, 1, 0),
        fovy: 45,
        aspect: 1,
        near: 0.1,
        far: 20
    }

    let options = {
        wireframe: false,
        normals: false,
        backfaceCulling: true,
        depthTest: true,
        shadingModel: "Phong",
        globalAmbient: [30, 30, 30]
    }

    let bunnyMaterial = {
        ka: [50, 25, 25],
        kd: [230, 150, 150],
        ks: [255, 255, 255],
        shininess: 100.0
    };

    // Light sources in WC
    let lights = [
        {
            enabled: true,
            type: 2,  // Spotlight
            position: [0, 8, 0, 1],
            ambient: [150, 150, 150],
            diffuse: [220, 220, 220],
            specular: [255, 255, 255],
            axis: [0, -1, 0],
            aperture: 50,
            cutoff: 8.0
        },
        {
            enabled: false,
            type: 0, //point
            position: [-5.0, 5.0, 5.0],
            ambient: [20, 20, 20],
            diffuse: [200, 200, 255],
            specular: [255, 255, 255],
            axis: [0, -1, 0],
            aperture: 30,
            cutoff: 5.0
        },
        {
            enabled: false,
            type: 1, // directional
            position: [0, -1, 0],
            ambient: [150, 150, 150],
            diffuse: [200, 200, 200],
            specular: [150, 150, 150],
            axis: [0, -1, 0],
            aperture: 30,
            cutoff: 5.0
        }
    ];

    const gui = new dat.GUI();

    const optionsGui = gui.addFolder("options");

    optionsGui.add(options, "shadingModel", ["Phong", "Gouraud"]).name("Shading Model");

    optionsGui.addColor(options, "globalAmbient").name("Global Ambient");

    optionsGui.add(options, "backfaceCulling").name("backface culling").onChange(v => {
        if (v) gl.enable(gl.CULL_FACE);
        else gl.disable(gl.CULL_FACE);
    });
    optionsGui.add(options, "depthTest").name("depth test").onChange(v => {
        if (v) gl.enable(gl.DEPTH_TEST);
        else gl.disable(gl.DEPTH_TEST);
    });

    const cameraGui = gui.addFolder("camera");
    cameraGui.add(camera, "fovy").min(1).max(179).step(1).listen();
    cameraGui.add(camera, "near").min(0.1).max(20).step(0.01).listen().onChange(function (v) {
        camera.near = Math.min(camera.far - 0.5, v);
    });
    cameraGui.add(camera, "far").min(0.1).max(20).step(0.01).listen().onChange(function (v) {
        camera.far = Math.max(camera.near + 0.5, v);
    });

    const eye = cameraGui.addFolder("eye");
    eye.add(camera.eye, 0).step(0.05).name("x").listen();
    eye.add(camera.eye, 1).step(0.05).name("y").listen();
    eye.add(camera.eye, 2).step(0.05).name("z").listen();

    const at = cameraGui.addFolder("at");
    at.add(camera.at, 0).step(0.05).name("x").listen();
    at.add(camera.at, 1).step(0.05).name("y").listen();
    at.add(camera.at, 2).step(0.05).name("z").listen();

    const up = cameraGui.addFolder("up");
    up.add(camera.up, 0).step(0.05).name("x").listen();
    up.add(camera.up, 1).step(0.05).name("y").listen();
    up.add(camera.up, 2).step(0.05).name("z").listen();

    const lightsGui = gui.addFolder("lights");

    for (let i = 0; i < 3; i++) {
        const light = lights[i];
        const lightFolder = lightsGui.addFolder(`Light${i + 1}`);

        lightFolder.add(light, "enabled");

        const typeNames = { "Point": 0, "Directional": 1, "Spotlight": 2 };
        lightFolder.add(light, "type", typeNames).onChange(v => {
            light.type = parseInt(v);
        });

        const posFolder = lightFolder.addFolder("position");
        posFolder.add(light.position, 0).min(-10).max(10).step(0.1).name("x").listen();
        posFolder.add(light.position, 1).min(-10).max(10).step(0.1).name("y").listen();
        posFolder.add(light.position, 2).min(-10).max(10).step(0.1).name("z").listen();

        if (light.position.length == 3) {
            light.position.push(1);
        }
        posFolder.add(light.position, 3).min(0).max(1).step(1).name("w").listen();

        const intensitiesFolder = lightFolder.addFolder("intensities");
        intensitiesFolder.addColor(light, "ambient");
        intensitiesFolder.addColor(light, "diffuse");
        intensitiesFolder.addColor(light, "specular");

        const axisFolder = lightFolder.addFolder("axis");
        axisFolder.add(light.axis, 0).min(-1).max(1).step(0.1).name("x");
        axisFolder.add(light.axis, 1).min(-1).max(1).step(0.1).name("y");
        axisFolder.add(light.axis, 2).min(-1).max(1).step(0.1).name("z");

        lightFolder.add(light, "aperture").min(1).max(90).step(1);
        lightFolder.add(light, "cutoff").min(0.1).max(50).step(0.1);
    }

    const materialGui = gui.addFolder("material");
    materialGui.addColor(bunnyMaterial, "ka").name("Ka");
    materialGui.addColor(bunnyMaterial, "kd").name("Kd");
    materialGui.addColor(bunnyMaterial, "ks").name("Ks");
    materialGui.add(bunnyMaterial, "shininess").min(1).max(500);

    let mProjection;
    let down = false;
    let lastX, lastY;

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    resizeCanvasToFullWindow();
    window.addEventListener('resize', resizeCanvasToFullWindow);

    window.addEventListener('wheel', function (event) {

        if (!event.altKey && !event.metaKey && !event.ctrlKey) {
            const factor = 1 - event.deltaY / 1000;
            camera.fovy = Math.max(1, Math.min(100, camera.fovy * factor));
        }
        else if (event.metaKey || event.ctrlKey) {
            const offset = event.deltaY / 1000;
            const dir = normalize(subtract(camera.at, camera.eye));
            const ce = add(camera.eye, scale(offset, dir));
            const ca = add(camera.at, scale(offset, dir));
            camera.eye[0] = ce[0]; camera.eye[1] = ce[1]; camera.eye[2] = ce[2];
            if (event.ctrlKey) {
                camera.at[0] = ca[0]; camera.at[1] = ca[1]; camera.at[2] = ca[2];
            }
        }
    });

    function inCameraSpace(m, viewMatrix) {
        const mInvView = inverse(viewMatrix);
        return mult(mInvView, mult(m, viewMatrix));
    }

    canvas.addEventListener('mousemove', function (event) {
        if (down) {
            const dx = event.offsetX - lastX;
            const dy = event.offsetY - lastY;
            if (dx != 0 || dy != 0) {
                const d = vec2(dx, dy);
                const axis = vec3(-dy, -dx, 0);
                const rotation = rotate(0.5 * length(d), axis);

                let tempView = lookAt(camera.eye, camera.at, camera.up);
                let eyeAt = subtract(camera.eye, camera.at);
                eyeAt = vec4(eyeAt[0], eyeAt[1], eyeAt[2], 0);
                let newUp = vec4(camera.up[0], camera.up[1], camera.up[2], 0);

                eyeAt = mult(inCameraSpace(rotation, tempView), eyeAt);
                newUp = mult(inCameraSpace(rotation, tempView), newUp);

                camera.eye[0] = camera.at[0] + eyeAt[0];
                camera.eye[1] = camera.at[1] + eyeAt[1];
                camera.eye[2] = camera.at[2] + eyeAt[2];
                camera.up[0] = newUp[0];
                camera.up[1] = newUp[1];
                camera.up[2] = newUp[2];
                lastX = event.offsetX;
                lastY = event.offsetY;
            }
        }
    });

    canvas.addEventListener('mousedown', function (event) {
        down = true;
        lastX = event.offsetX;
        lastY = event.offsetY;
    });

    canvas.addEventListener('mouseup', function (event) {
        down = false;
    });

    window.requestAnimationFrame(render);

    function resizeCanvasToFullWindow() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        camera.aspect = canvas.width / canvas.height;
        gl.viewport(0, 0, canvas.width, canvas.height);
    }

    // Convert light from World Coordinates to Camera Coordinates
    function uploadLights(mView) {
        gl.uniform1i(gl.getUniformLocation(program, "u_n_lights"), lights.length);

        // Process each light
        for (let i = 0; i < lights.length; i++) {
            const light = lights[i];

            gl.uniform1i(gl.getUniformLocation(program, "u_lights[" + i + "].enabled"), light.enabled);
            gl.uniform1i(gl.getUniformLocation(program, "u_lights[" + i + "].type"), light.type);

            // Transform light position/direction from WC to Camera Coordinates
            let lightPositionCamera;
            if (light.type == 1) {
                const direction = vec4(light.position[0], light.position[1], light.position[2], 0.0);
                lightPositionCamera = mult(mView, direction);
            } else {
                const position = vec4(light.position[0], light.position[1], light.position[2], 1.0);
                lightPositionCamera = mult(mView, position);
            }
            gl.uniform4fv(gl.getUniformLocation(program, "u_lights[" + i + "].position"), flatten(lightPositionCamera));

            // Transform spotlight axis from WC to Camera Coordinates
            const axisWC = vec4(light.axis[0], light.axis[1], light.axis[2], 0.0);
            const axisCamera = mult(mView, axisWC);
            gl.uniform3fv(gl.getUniformLocation(program, "u_lights[" + i + "].axis"),
                flatten(vec3(axisCamera[0], axisCamera[1], axisCamera[2])));

            // spotlight
            gl.uniform1f(gl.getUniformLocation(program, "u_lights[" + i + "].aperture"),
                light.aperture * Math.PI / 180.0); // Convert degrees to radians
            gl.uniform1f(gl.getUniformLocation(program, "u_lights[" + i + "].cutoff"), light.cutoff);

            gl.uniform3fv(gl.getUniformLocation(program, "u_lights[" + i + "].ambient"),
                flatten(vec3(light.ambient[0] / 255, light.ambient[1] / 255, light.ambient[2] / 255)));
            gl.uniform3fv(gl.getUniformLocation(program, "u_lights[" + i + "].diffuse"),
                flatten(vec3(light.diffuse[0] / 255, light.diffuse[1] / 255, light.diffuse[2] / 255)));
            gl.uniform3fv(gl.getUniformLocation(program, "u_lights[" + i + "].specular"),
                flatten(vec3(light.specular[0] / 255, light.specular[1] / 255, light.specular[2] / 255)));
        }
    }

    // Send transformation matrices 
    function updateUniforms(mModelView) {

        gl.uniformMatrix4fv(gl.getUniformLocation(program, "u_model_view"), false, flatten(mModelView));

        gl.uniformMatrix4fv(gl.getUniformLocation(program, "u_projection"), false, flatten(mProjection));

        const mNormals = normalMatrix(mModelView);
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "u_normals"), false, flatten(mNormals));

        gl.uniform1i(gl.getUniformLocation(program, "u_use_normals"), options.normals);

        gl.uniform1i(gl.getUniformLocation(program, "u_use_gouraud"), options.shadingModel === "Gouraud");

        gl.uniform3fv(gl.getUniformLocation(program, "u_global_ambient"),
            flatten(vec3(options.globalAmbient[0] / 255, options.globalAmbient[1] / 255, options.globalAmbient[2] / 255)));

    }

    // Send material properties to shader
    function uploadMaterial(ka, kd, ks, shininess) {
        gl.uniform3fv(gl.getUniformLocation(program, "u_material.Ka"), flatten(ka));
        gl.uniform3fv(gl.getUniformLocation(program, "u_material.Kd"), flatten(kd));
        gl.uniform3fv(gl.getUniformLocation(program, "u_material.Ks"), flatten(ks));
        gl.uniform1f(gl.getUniformLocation(program, "u_material.shininess"), shininess);
    }

    function render(time) {
        window.requestAnimationFrame(render);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(program);

        const mView = lookAt(camera.eye, camera.at, camera.up);


        mProjection = perspective(camera.fovy, camera.aspect, camera.near, camera.far);

        const drawMode = options.wireframe ? gl.LINES : gl.TRIANGLES;

        uploadLights(mView);

        let mModelView;

        // ===== Ground =====
        mModelView = mult(mView, translate(0, -0.25, 0));
        const groundScale = [
            vec4(10, 0, 0, 0),
            vec4(0, 0.5, 0, 0),
            vec4(0, 0, 10, 0),
            vec4(0, 0, 0, 1)
        ];
        groundScale.matrix = true;
        mModelView = mult(mModelView, groundScale);
        updateUniforms(mModelView);
        uploadMaterial(
            vec3(0.3, 0.2, 0.15),    // Ka - ambient
            vec3(0.6, 0.5, 0.4),    // Kd - diffuse
            vec3(0.1, 0.1, 0.1),     // Ks - specular
            10.0                     // shininess
        );
        CUBE.draw(gl, program, drawMode);

        // ===== Cube =====
        mModelView = mult(mView, translate(-2.5, 1.0, -2.5));
        const cubeScale = [
            vec4(2, 0, 0, 0),
            vec4(0, 2, 0, 0),
            vec4(0, 0, 2, 0),
            vec4(0, 0, 0, 1)
        ];
        cubeScale.matrix = true;
        mModelView = mult(mModelView, cubeScale);
        updateUniforms(mModelView);
        uploadMaterial(
            vec3(0.2, 0.1, 0.1),
            vec3(0.8, 0.4, 0.4),
            vec3(0.5, 0.5, 0.5),
            100.0
        );
        CUBE.draw(gl, program, drawMode);

        // ===== Cylinder =====
        mModelView = mult(mView, translate(2.5, 1.0, -2.5));
        const cylinderScale = [
            vec4(2, 0, 0, 0),
            vec4(0, 2, 0, 0),
            vec4(0, 0, 2, 0),
            vec4(0, 0, 0, 1)
        ];
        cylinderScale.matrix = true;
        mModelView = mult(mModelView, cylinderScale);
        updateUniforms(mModelView);
        uploadMaterial(
            vec3(0.05, 0.15, 0.125),
            vec3(0.2, 0.6, 0.5),
            vec3(0.6, 0.6, 0.6),
            80.0
        );
        CYLINDER.draw(gl, program, drawMode);

        // ===== Torus =====
        mModelView = mult(mView, translate(-2.5, 0.4, 2.5));
        const torusScale = [
            vec4(2, 0, 0, 0),
            vec4(0, 2, 0, 0),
            vec4(0, 0, 2, 0),
            vec4(0, 0, 0, 1)
        ];
        torusScale.matrix = true;
        mModelView = mult(mModelView, torusScale);
        updateUniforms(mModelView);
        uploadMaterial(
            vec3(0.075, 0.175, 0.075),
            vec3(0.3, 0.7, 0.3),
            vec3(0.4, 0.4, 0.4),
            60.0
        );
        TORUS.draw(gl, program, drawMode);

        // ===== Bunny =====
        mModelView = mult(mView, translate(2.5, 1.0, 2.5));
        const bunnyScale = [
            vec4(2.0, 0, 0, 0),
            vec4(0, 2.0, 0, 0),
            vec4(0, 0, 2.0, 0),
            vec4(0, 0, 0, 1)
        ];
        bunnyScale.matrix = true;
        mModelView = mult(mModelView, bunnyScale);
        updateUniforms(mModelView);
        uploadMaterial(
            vec3(bunnyMaterial.ka[0] / 255, bunnyMaterial.ka[1] / 255, bunnyMaterial.ka[2] / 255),
            vec3(bunnyMaterial.kd[0] / 255, bunnyMaterial.kd[1] / 255, bunnyMaterial.kd[2] / 255),
            vec3(bunnyMaterial.ks[0] / 255, bunnyMaterial.ks[1] / 255, bunnyMaterial.ks[2] / 255),
            bunnyMaterial.shininess
        );
        BUNNY.draw(gl, program, drawMode);
    }
}

const urls = ['shader.vert', 'shader.frag'];

loadShadersFromURLS(urls).then(shaders => setup(shaders));