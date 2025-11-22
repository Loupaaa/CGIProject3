#version 300 es

precision mediump float;

const int MAX_LIGHTS = 8;

struct LightInfo {
    vec3 ambient;
    vec3 diffuse;
    vec3 specular;
    vec4 position;
    vec3 axis;      // direction
    float aperture; // aperture angle 
    float cutoff;
    bool enabled;
    int type;       // 0 = point, 1 = directional, 2 = spotlight
};

struct MaterialInfo {
    vec3 Ka;
    vec3 Kd;
    vec3 Ks;
    float shininess;
};

uniform bool u_use_normals;
uniform vec3 u_color;
uniform int u_n_lights;
uniform LightInfo u_lights[MAX_LIGHTS];
uniform MaterialInfo u_material;

in vec3 v_normal;
in vec3 v_position;

out vec4 color;

void main() {

    if(u_use_normals) {
        color = vec4(0.5f * (v_normal + vec3(1.0f)), 1.0f);
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

        vec3 ambient = u_lights[l].ambient * u_material.Ka;

        vec3 L;
        if(u_lights[l].type == 1) {
            L = normalize(-u_lights[l].position.xyz);
        } else {

            L = normalize(u_lights[l].position.xyz - v_position);
        }

        float attenuation = 1.0f;

        // Spotlight attenuation
        if(u_lights[l].type == 2) {
            vec3 spotDir = normalize(-u_lights[l].axis);
            float spotCos = dot(-L, spotDir);
            float spotAngle = acos(spotCos);

            if(spotAngle > u_lights[l].aperture) {

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

        finalColor += ambient + attenuation * (diffuse + specular);
    }

    color = vec4(finalColor, 1.0f);
}