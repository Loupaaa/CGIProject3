import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from '../../libs/utils.js';
import { length, flatten, inverse, mult, normalMatrix, perspective, lookAt, vec4, vec3, vec2, subtract, add, scale, rotate, normalize, translate } from '../../libs/MV.js';

import * as dat from '../../libs/dat.gui.module.js';

import * as CUBE from '../../libs/objects/cube.js';
import * as SPHERE from '../../libs/objects/sphere.js';
import * as CYLINDER from '../../libs/objects/cylinder.js';
import * as TORUS from '../../libs/objects/torus.js';
import * as BUNNY from '../../libs/objects/bunny.js';

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
        normals: false
    }

    let bunnyMaterial = {
        ka: [50, 25, 25],   // Ambient 
        kd: [230, 150, 150],
        ks: [255, 255, 255],
        shininess: 100.0
    };

    const gui = new dat.GUI();
    const optionsGui = gui.addFolder("options");
    optionsGui.add(options, "wireframe");
    optionsGui.add(options, "normals");

    const cameraGui = gui.addFolder("camera");
    cameraGui.add(camera, "fovy").min(1).max(179).step(1).listen();
    cameraGui.add(camera, "aspect").min(0).max(10).step(0.01).listen().domElement.style.pointerEvents = "none";
    cameraGui.add(camera, "near").min(0.1).max(20).step(0.01).listen().onChange(function (v) {
        camera.near = Math.min(camera.far - 0.5, v);
    });
    cameraGui.add(camera, "far").min(0.1).max(20).step(0.01).listen().onChange(function (v) {
        camera.far = Math.max(camera.near + 0.5, v);
    });

    const materialGui = gui.addFolder("Bunny Material");
    materialGui.addColor(bunnyMaterial, "ka");
    materialGui.addColor(bunnyMaterial, "kd");
    materialGui.addColor(bunnyMaterial, "ks");
    materialGui.add(bunnyMaterial, "shininess").min(1).max(500);

    const eye = cameraGui.addFolder("eye");
    eye.add(camera.eye, 0).step(0.05).listen();
    eye.add(camera.eye, 1).step(0.05).listen();
    eye.add(camera.eye, 2).step(0.05).listen();

    const at = cameraGui.addFolder("at");
    at.add(camera.at, 0).step(0.05).listen();
    at.add(camera.at, 1).step(0.05).listen();
    at.add(camera.at, 2).step(0.05).listen();

    const up = cameraGui.addFolder("up");
    up.add(camera.up, 0).step(0.05).listen();
    up.add(camera.up, 1).step(0.05).listen();
    up.add(camera.up, 2).step(0.05).listen();




    let mProjection;
    let down = false;
    let lastX, lastY;

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

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

    function updateUniforms(modelViewMatrix) {
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "u_model_view"), false, flatten(modelViewMatrix));
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "u_projection"), false, flatten(mProjection));
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "u_normals"), false, flatten(normalMatrix(modelViewMatrix)));
        gl.uniform1i(gl.getUniformLocation(program, "u_use_normals"), options.normals);
    }

    function uploadMaterial(ka, kd, ks, shininess) {
        gl.uniform3fv(gl.getUniformLocation(program, "u_material.Ka"), flatten(ka));
        gl.uniform3fv(gl.getUniformLocation(program, "u_material.Kd"), flatten(kd));
        gl.uniform3fv(gl.getUniformLocation(program, "u_material.Ks"), flatten(ks));
        gl.uniform1f(gl.getUniformLocation(program, "u_material.shininess"), shininess);
    }

    function uploadColor(r, g, b) {
        gl.uniform3fv(gl.getUniformLocation(program, "u_color"), flatten(vec3(r, g, b)));
    }

    function render(time) {
        window.requestAnimationFrame(render);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(program);

        const baseView = lookAt(camera.eye, camera.at, camera.up);
        mProjection = perspective(camera.fovy, camera.aspect, camera.near, camera.far);
        const drawMode = options.wireframe ? gl.LINES : gl.TRIANGLES;

        let mView;
        let s;

        // --- ground
        mView = mult(baseView, translate(0, -0.25, 0));
        s = [vec4(10, 0, 0, 0), vec4(0, 0.5, 0, 0), vec4(0, 0, 10, 0), vec4(0, 0, 0, 1)];
        s.matrix = true;
        mView = mult(mView, s);
        updateUniforms(mView);
        uploadColor(0.82, 0.71, 0.55);
        CUBE.draw(gl, program, drawMode);

        // --- Cube(Back-Left)
        mView = mult(baseView, translate(-1.8, 1.0, -1.8));
        s = [vec4(2, 0, 0, 0), vec4(0, 2, 0, 0), vec4(0, 0, 2, 0), vec4(0, 0, 0, 1)];
        s.matrix = true;
        mView = mult(mView, s);
        updateUniforms(mView);
        uploadColor(0.8, 0.4, 0.4);
        CUBE.draw(gl, program, drawMode);

        // --- Cylinder(Back-Right)
        mView = mult(baseView, translate(1.8, 1.0, -1.8));
        s = [vec4(2, 0, 0, 0), vec4(0, 2, 0, 0), vec4(0, 0, 2, 0), vec4(0, 0, 0, 1)];
        s.matrix = true;
        mView = mult(mView, s);
        updateUniforms(mView);
        uploadColor(0.2, 0.6, 0.5);
        CYLINDER.draw(gl, program, drawMode);

        // --- Torus(Front-Left) 

        mView = mult(baseView, translate(-1.8, 0.5, 1.8));
        s = [vec4(2, 0, 0, 0), vec4(0, 2, 0, 0), vec4(0, 0, 2, 0), vec4(0, 0, 0, 1)];
        s.matrix = true;
        mView = mult(mView, s);
        updateUniforms(mView);
        uploadColor(0.3, 0.7, 0.3);
        TORUS.draw(gl, program, drawMode);

        // --- Bunny(Front-Right)

        mView = mult(baseView, translate(1.8, 0.5, 1.8));
        s = [vec4(2.0, 0, 0, 0), vec4(0, 2.0, 0, 0), vec4(0, 0, 2.0, 0), vec4(0, 0, 0, 1)];
        s.matrix = true;
        mView = mult(mView, s);
        updateUniforms(mView);
        uploadColor(0.9, 0.7, 0.8);
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