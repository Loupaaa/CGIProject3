#version 300 es

in vec4 a_position;
in vec3 a_normal;

uniform mat4 u_projection;
uniform mat4 u_model_view;
uniform mat4 u_normals;

out vec3 v_normal;
out vec3 v_position;

void main() {

    vec4 pos_camera = u_model_view * a_position;
    v_position = pos_camera.xyz;

    v_normal = normalize((u_normals * vec4(a_normal, 0.0f)).xyz);

    // Final pos?
    gl_Position = u_projection * pos_camera;
}