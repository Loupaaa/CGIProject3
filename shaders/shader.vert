#version 300 es

precision mediump float;
precision mediump int;

in vec4 a_position;
in vec3 a_normal;

uniform mat4 u_projection;
uniform mat4 u_model_view;
uniform mat4 u_normals;

// Uniforms para iluminação (necessários para Gouraud)
uniform bool u_use_gouraud;
uniform int u_n_lights;

const int MAX_LIGHTS = 8;

struct LightInfo {
    vec3 ambient;
    vec3 diffuse;
    vec3 specular;
    vec4 position;
    vec3 axis;
    float aperture;
    float cutoff;
    bool enabled;
    int type;
};

struct MaterialInfo {
    vec3 Ka;
    vec3 Kd;
    vec3 Ks;
    float shininess;
};

uniform LightInfo u_lights[MAX_LIGHTS];
uniform MaterialInfo u_material;

// Outputs
out vec3 v_normal;
out vec3 v_position;
out vec4 v_color; // Cor calculada no vertex shader (Gouraud)

void main() {
    // Posição no espaço da câmera
    vec4 pos_camera = u_model_view * a_position;
    v_position = pos_camera.xyz;

    // Normal transformada
    v_normal = normalize((u_normals * vec4(a_normal, 0.0f)).xyz);

    // Posição final
    gl_Position = u_projection * pos_camera;

    // ============= GOURAUD SHADING =============
    if(u_use_gouraud) {
        vec3 posC = pos_camera.xyz;
        vec3 N = normalize((u_normals * vec4(a_normal, 0.0f)).xyz);
        vec3 V = normalize(-posC);

        vec3 finalColor = vec3(0.0f);

        for(int l = 0; l < MAX_LIGHTS; l++) {
            if(l >= u_n_lights)
                break;
            if(!u_lights[l].enabled)
                continue;

            // Ambient term
            vec3 ambient = u_lights[l].ambient * u_material.Ka;

            // Light direction
            vec3 L;
            if(u_lights[l].type == 1) {
                // Directional light
                L = normalize(-u_lights[l].position.xyz);
            } else {
                // Point/Spot light
                L = normalize(u_lights[l].position.xyz - posC);
            }

            float attenuation = 1.0f;

            // Spotlight attenuation
            if(u_lights[l].type == 2) {
                vec3 spotDir = normalize(u_lights[l].axis);
                float spotCos = dot(-L, spotDir);

                if(spotCos < cos(u_lights[l].aperture)) {
                    attenuation = 0.0f;
                } else {
                    attenuation = pow(spotCos, u_lights[l].cutoff);
                }
            }

            // Diffuse
            float NdotL = max(dot(N, L), 0.0f);
            vec3 diffuse = u_lights[l].diffuse * u_material.Kd * NdotL;

            // Specular
            vec3 R = reflect(-L, N);
            float RdotV = max(dot(R, V), 0.0f);
            vec3 specular = u_lights[l].specular * u_material.Ks * pow(RdotV, u_material.shininess);

            if(NdotL <= 0.0f) {
                specular = vec3(0.0f);
            }

            finalColor += ambient + attenuation * (diffuse + specular);
        }

        v_color = vec4(finalColor, 1.0f);
    }
}