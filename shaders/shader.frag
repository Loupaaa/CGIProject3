#version 300 es

precision mediump float;
precision mediump int;

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

uniform bool u_use_normals;
uniform bool u_use_gouraud;
uniform vec3 u_color;
uniform int u_n_lights;
uniform LightInfo u_lights[MAX_LIGHTS];
uniform MaterialInfo u_material;

in vec3 v_normal;
in vec3 v_position;
in vec4 v_color;

out vec4 color;

void main() {
    if(u_use_normals) {
        color = vec4(0.5f * (v_normal + vec3(1.0f)), 1.0f);
        return;
    }

    if(u_use_gouraud) {
        color = v_color;
        return;
    }

    vec3 N = normalize(v_normal);
    vec3 V = normalize(-v_position);

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
            L = normalize(-u_lights[l].position.xyz);
        } else {
            L = normalize(u_lights[l].position.xyz - v_position);
        }

        float attenuation = 1.0f;

        if(u_lights[l].type == 2) {
            vec3 spotDir = normalize(u_lights[l].axis);
            float spotCos = dot(-L, spotDir);

            if(spotCos < cos(u_lights[l].aperture)) {
                attenuation = 0.0f;
            } else {
                attenuation = pow(spotCos, u_lights[l].cutoff);
            }
        }

        float NdotL = max(dot(N, L), 0.0f);
        vec3 diffuse = u_lights[l].diffuse * u_material.Kd * NdotL;

        vec3 R = reflect(-L, N);
        float RdotV = max(dot(R, V), 0.0f);
        vec3 specular = u_lights[l].specular * u_material.Ks * pow(RdotV, u_material.shininess);

        // Prevent specular negatives
        if(NdotL <= 0.0f) {
            specular = vec3(0.0f);
        }

        finalColor += ambient + attenuation * (diffuse + specular);
    }

    color = vec4(finalColor, 1.0f);
}