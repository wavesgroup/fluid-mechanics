---
title: "Quick reference"
order: 101
number: "A"
kind: "appendix"
---

This section serves a quick reference for the key equations used in this book.

<strong>Gradient:</strong>

<div class="display-math">

$$
\nabla = \frac{\partial}{\partial x} \mathbf{i} + \frac{\partial}{\partial y} \mathbf{j} + \frac{\partial}{\partial z} \mathbf{k}
$$

</div>

<strong>Divergence:</strong>

<div class="display-math">

$$
\nabla \cdot \mathbf{u} = \frac{\partial u}{\partial x} + \frac{\partial v}{\partial y} + \frac{\partial w}{\partial z}
$$

</div>

<strong>Curl:</strong>

<div class="display-math">

$$
\nabla \times \mathbf{u} = \left( \frac{\partial w}{\partial y} - \frac{\partial v}{\partial z} \right) \mathbf{i} + \left( \frac{\partial u}{\partial z} - \frac{\partial w}{\partial x} \right) \mathbf{j} + \left( \frac{\partial v}{\partial x} - \frac{\partial u}{\partial y} \right) \mathbf{k}
$$

</div>

<strong>Laplacian:</strong>

<div class="display-math">

$$
\nabla^2 = \frac{\partial^2}{\partial x^2} + \frac{\partial^2}{\partial y^2} + \frac{\partial^2}{\partial z^2}
$$

</div>

<strong>Curl of a gradient:</strong>

<div class="display-math">

$$
\nabla \times (\nabla T) = 0
$$

</div>

<strong>Divergence of a curl:</strong>

<div class="display-math">

$$
\nabla \cdot (\nabla \times \mathbf{u}) = 0
$$

</div>

<strong>Lagrangian derivative operator:</strong>

<div class="display-math">

$$
\frac{d}{dt} = \frac{\partial}{\partial t} + (\mathbf{u} \cdot \nabla)
$$

</div>

<strong>Velocity as a gradient of a scalar potential:</strong>

<div class="display-math">

$$
\mathbf{u} = \nabla \phi
$$

</div>

<strong>Continuity, Eulerian form:</strong>

<div class="display-math">

$$
\frac{\partial \rho}{\partial t} + \nabla (\rho \mathbf{u}) = 0
$$

</div>

<strong>Continuity, Lagrangian form:</strong>

<div class="display-math">

$$
\frac{d\rho}{dt} + \rho \nabla \cdot \mathbf{u} = 0
$$

</div>

<strong>Momentum, Cauchy:</strong>

<div class="display-math">

$$
\frac{\partial \mathbf{u}}{\partial t} + (\mathbf{u} \cdot \nabla) \mathbf{u} =
\frac{1}{\rho} \nabla \cdot \boldsymbol{\sigma} + \frac{\mathbf{F}_b}{\rho}
$$

</div>

<strong>Stress tensor as a combination of pressure and deviatoric stress:</strong>

<div class="display-math">

$$
\boldsymbol{\sigma} = -p \mathbf{I} + \boldsymbol{\tau}
$$

</div>

<strong>Momentum, Euler:</strong>

<div class="display-math">

$$
\frac{\partial \mathbf{u}}{\partial t} + (\mathbf{u} \cdot \nabla) \mathbf{u} =
- \frac{1}{\rho} \nabla p
$$

</div>

<strong>Momentum, Navier-Stokes:</strong>

<div class="display-math">

$$
\frac{\partial \mathbf{u}}{\partial t} + (\mathbf{u} \cdot \nabla) \mathbf{u} =
- \frac{1}{\rho} \nabla p + \nu \nabla^2 \mathbf{u} + \frac{\mathbf{F}_b}{\rho}
$$

</div>

<strong>Momentum, with body force (gravity):</strong>

<div class="display-math">

$$
\frac{\partial \mathbf{u}}{\partial t} + (\mathbf{u} \cdot \nabla) \mathbf{u} =
- \frac{1}{\rho} \nabla p + \mathbf{g} + \nu \nabla^2 \mathbf{u}
$$

</div>

<strong>Momentum, Navier-Stokes, in scalar form:</strong>

<div class="display-math">

$$
\frac{\partial u}{\partial t} +
u \frac{\partial u}{\partial x} +
v \frac{\partial u}{\partial y} +
w \frac{\partial u}{\partial z} =
- \frac{1}{\rho} \frac{\partial p}{\partial x} + \nu \left( \frac{\partial^2 u}{\partial x^2} + \frac{\partial^2 u}{\partial y^2} + \frac{\partial^2 u}{\partial z^2} \right)
$$

</div>

<div class="display-math">

$$
\frac{\partial v}{\partial t} +
u \frac{\partial v}{\partial x} +
v \frac{\partial v}{\partial y} +
w \frac{\partial v}{\partial z} =
- \frac{1}{\rho} \frac{\partial p}{\partial y} + \nu \left( \frac{\partial^2 v}{\partial x^2} + \frac{\partial^2 v}{\partial y^2} + \frac{\partial^2 v}{\partial z^2} \right)
$$

</div>

<div class="display-math">

$$
\frac{\partial w}{\partial t} +
u \frac{\partial w}{\partial x} +
v \frac{\partial w}{\partial y} +
w \frac{\partial w}{\partial z} =
- \frac{1}{\rho} \frac{\partial p}{\partial z} - g + \nu \left( \frac{\partial^2 w}{\partial x^2} + \frac{\partial^2 w}{\partial y^2} + \frac{\partial^2 w}{\partial z^2} \right)
$$

</div>

<strong>Equation of state, moist air:</strong>

<div class="display-math">

$$
p = \rho R_d T \left[1 + q \left(\frac{R_v}{R_d} - 1 \right) \right]
$$

</div>

<strong>Equation of state, seawater:</strong>

<div class="display-math">

$$
\rho = \rho_0 \left[ 1 - \beta_T(T-T_0) + \beta_S(S-S_0) - \beta_p(p-p_0) \right]
$$

</div>

<strong>Hydrostatic approximation:</strong>

<div class="display-math">

$$
\frac{dw}{dt} = 0
$$

</div>

<div class="display-math">

$$
\frac{\partial p}{\partial z} = -\rho g
$$

</div>

<strong>Rate of change of a rotating vector:</strong>

<div class="display-math">

$$
\left(\frac{d\mathbf{C}}{dt}\right)_I = \mathbf{\Omega} \times \mathbf{C}
$$

</div>

<strong>Rate of change of a rotating vector in a rotating frame:</strong>

<div class="display-math">

$$
\left(\frac{d\mathbf{B}}{dt}\right)_I = \left(\frac{d\mathbf{B}}{dt}\right)_R + \mathbf{\Omega} \times \mathbf{B}
$$

</div>

<strong>Rate of change of velocity in a rotating frame:</strong>

<div class="display-math">

$$
\left( \frac{d \mathbf{u}_R}{dt} \right)_R =
\left( \frac{d \mathbf{u}_I}{dt} \right)_I -
2 \mathbf{\Omega} \times \mathbf{u}_R -
\mathbf{\Omega} \times \left( \mathbf{\Omega} \times \mathbf{r} \right)
$$

</div>

<strong>Navier-Stokes equation with rotation:</strong>

<div class="display-math">

$$
\frac{\partial \mathbf{u}}{\partial t} +
\left( \mathbf{u} \cdot \nabla \right) \mathbf{u} =
- \frac{1}{\rho} \nabla p
- \frac{1}{\rho} \nabla \Phi
- 2 \mathbf{\Omega} \times \mathbf{u}
+ \nu \nabla^2 \mathbf{u}
$$

</div>

<strong>Coriolis parameter:</strong>

<div class="display-math">

$$
f = 2 \Omega \sin(\theta)
$$

</div>

<strong>$f$-plane approximation:</strong>

<div class="display-math">

$$
f = f_0 = 2 \Omega \sin(\theta_0)
$$

</div>

<strong>$\beta$-plane approximation:</strong>

<div class="display-math">

$$
f = f_0 + \beta y
$$

</div>

<div class="display-math">

$$
\beta = \frac{\partial f}{\partial y} = \frac{2\Omega\cos(\theta_0)}{R_E}
$$

</div>

<strong>Geostrophic balance:</strong>

<div class="display-math">

$$
\mathbf{f} \times \mathbf{u} = - \frac{1}{\rho} \nabla p
$$

</div>

<strong>Geostrophic velocity:</strong>

<div class="display-math">

$$
u_g = - \frac{1}{\rho f} \frac{\partial p}{\partial y}
$$

</div>

<div class="display-math">

$$
v_g = \frac{1}{\rho f} \frac{\partial p}{\partial x}
$$

</div>

<strong>Rossby number:</strong>

<div class="display-math">

$$
\text{Ro} \equiv \frac{\left( \mathbf{u} \cdot \nabla \right) \mathbf{u}}{\mathbf{f} \times \mathbf{u}} \approx \frac{U}{fL}
$$

</div>

<strong>Boussinesq approximation:</strong>

<div class="display-math">

$$
\rho = \rho_0 + \delta \rho(x, y, z, t)
$$

</div>

<div class="display-math">

$$
p = p_0(z) + \delta p(x, y, z, t)
$$

</div>

<strong>Boussinesq equations:</strong>

<div class="display-math">

$$
\frac{d \mathbf{u}}{dt} + \mathbf{f} \times \mathbf{u} =
- \frac{1}{\rho_0} \nabla \delta p + b \mathbf{k}
$$

</div>

<div class="display-math">

$$
\nabla \cdot \mathbf{u} = 0
$$

</div>

<div class="display-math">

$$
\frac{d T}{dt} = \dot{T}
$$

</div>

<div class="display-math">

$$
\frac{d S}{dt} = \dot{S}
$$

</div>

<div class="display-math">

$$
b = b(T, S, p)
$$

</div>

<strong>Buoyancy:</strong>

<div class="display-math">

$$
b = - g \frac{\delta \rho}{\rho_0}
$$

</div>

<strong>Thermal wind balance:</strong>

<div class="display-math">

$$
\frac{\partial u_g}{\partial z} = - \frac{1}{f} \frac{\partial b}{\partial y}
$$

</div>

<div class="display-math">

$$
\frac{\partial v_g}{\partial z} = \frac{1}{f} \frac{\partial b}{\partial x}
$$

</div>

<strong>Potential density:</strong>

<div class="display-math">

$$
\rho_\theta = \rho + \frac{p_0 g z}{c_s^2}
$$

</div>

<strong>Brunt-Väisälä (buoyancy) frequency:</strong>

<div class="display-math">

$$
N^2 = - \frac{g}{\widetilde{\rho}_\theta} \frac{\partial \widetilde{\rho}_\theta}{\partial z}
$$

</div>

<strong>Static instability:</strong>

<div class="display-math">

$$
\frac{\partial \widetilde{\rho}_\theta}{\partial z} < 0 \quad \text{(stable)}
$$

</div>

<div class="display-math">

$$
\frac{\partial \widetilde{\rho}_\theta}{\partial z} > 0 \quad \text{(unstable)}
$$

</div>

<strong>Shallow water momentum equation:</strong>

<div class="display-math">

$$
\frac{d \mathbf{u}}{dt} + \mathbf{f} \times \mathbf{u} = - g \nabla \eta
$$

</div>

<strong>Shallow water continuity equation:</strong>

<div class="display-math">

$$
\frac{\partial \eta}{\partial t} + \nabla \cdot (h \mathbf{u}) = 0
$$

</div>

<strong>Inertial-gravity wave dispersion:</strong>

<div class="display-math">

$$
\omega = \sqrt{f^2 + gH(k^2 + l^2)}
$$

</div>

<strong>Gravity wave dispersion:</strong>

<div class="display-math">

$$
\omega = \sqrt{gH(k^2 + l^2)}
$$

</div>

<strong>Inertial wave dispersion:</strong>

<div class="display-math">

$$
\omega = f
$$

</div>

<strong>Kelvin wave:</strong>

<div class="display-math">

$$
u = \widehat{u}_0 e^{\frac{y}{L_d}} e^{i(x - \sqrt{gH} t)}
$$

</div>

<div class="display-math">

$$
\eta = \sqrt{\frac{H}{g}} \widehat{u}_0 e^{\frac{y}{L_d}} e^{i(x - \sqrt{gH} t)}
$$

</div>

<strong>Rossby radius of deformation:</strong>

<div class="display-math">

$$
L_d = \frac{\sqrt{gH}}{f}
$$

</div>

<strong>Conservation of potential vorticity:</strong>

<div class="display-math">

$$
\frac{d}{dt} \left( \frac{\zeta + f}{h} \right) = 0
$$

</div>

<strong>Potential vorticity:</strong>

<div class="display-math">

$$
\frac{\zeta + f}{h}
$$

</div>

<strong>Conservation of potential energy:</strong>

<div class="display-math">

$$
\frac{\partial}{\partial t} \left( \frac{gh^2}{2} \right) +
\nabla \left( \mathbf{u} \frac{gh^2}{2} \right) +
\frac{gh^2}{2} \nabla \cdot \mathbf{u} = 0
$$

</div>

<strong>Conservation of kinetic energy:</strong>

<div class="display-math">

$$
\frac{\partial}{\partial t} \left( \frac{h \mathbf{u}^2}{2} \right)
+ \nabla \cdot \left( \mathbf{u} \frac{h \mathbf{u}^2}{2} \right)
+ g\mathbf{u}\nabla \left(\frac{h^2}{2}\right)
= 0
$$

</div>

<strong>Conservation of total energy:</strong>

<div class="display-math">

$$
\frac{\partial E}{\partial t} = \frac{\partial PE}{\partial t} + \frac{\partial KE}{\partial t}
$$

</div>

<div class="display-math">

$$
\frac{\partial}{\partial t} \frac{1}{2} \left(h\mathbf{u}^2 + gh^2\right)
+ \nabla \cdot \left[ \mathbf{u} \left( \frac{1}{2} h\mathbf{u}^2 + gh^2\right) \right] = 0
$$

</div>

<div class="display-math">

$$
\frac{\partial E}{\partial t} + \nabla \cdot \left( \mathbf{F} \right) = 0
$$

</div>

<strong>Energy flux:</strong>

<div class="display-math">

$$
\mathbf{F} = \mathbf{u} \left( \frac{1}{2} h\mathbf{u}^2 + gh^2\right)
$$

</div>

<strong>Rossby wave frequency:</strong>

<div class="display-math">

$$
\omega = Uk - \frac{\beta}{k}
$$

</div>

<strong>Rossby wave phase speed:</strong>

<div class="display-math">

$$
c_p = U - \frac{\beta}{k^2}
$$

</div>

<strong>Rossby wave group speed:</strong>

<div class="display-math">

$$
c_g = U + \frac{\beta}{k^2}
$$

</div>

<strong>Reynolds decomposition:</strong>

<div class="display-math">

$$
\mathbf{u} = \overline{\mathbf{u}} + \mathbf{u}'
$$

</div>

<strong>Reynolds-averaged Navier-Stokes equation:</strong>

<div class="display-math">

$$
\frac{\partial \overline{\mathbf{u}}}{\partial t} +
\nabla \cdot \left( \overline{\mathbf{u}}\, \overline{\mathbf{u}} \right) =
- \frac{1}{\rho} \nabla \overline{p} +
\nu \nabla^2 \overline{\mathbf{u}} +
\nabla \cdot \left( \overline{\mathbf{u}' \mathbf{u}'} \right)
$$

</div>

<strong>Reynolds-averaged continuity equation:</strong>

<div class="display-math">

$$
\nabla \cdot \overline{\mathbf{u}} = 0
$$

</div>

<strong>Turbulent Kinetic Energy:</strong>

<div class="display-math">

$$
k = \frac{1}{2} \overline{\mathbf{u}'^2}
$$

</div>

<strong>Turbulent Kinetic Energy budget:</strong>

<div class="display-math">

$$
\frac{\partial k}{\partial t} + \overline{\mathbf{u}} \cdot \nabla k =
- \frac{1}{2} \nabla \cdot (\overline{\mathbf{u}' \mathbf{u}' \mathbf{u}'})
- (\overline{\mathbf{u}' \mathbf{u}'} \cdot \nabla) \overline{\mathbf{u}}
- \frac{1}{\rho} \overline{\mathbf{u}' \nabla p'}
+ \overline{\frac{\delta \rho'}{\rho} \mathbf{u}' \cdot \mathbf{g}}
+ \nu \nabla^2 k
- \nu \overline{\nabla \mathbf{u}' \cdot \nabla \mathbf{u}'}
$$

</div>

<strong>Kolmogorov's turbulence spectrum:</strong>

<div class="display-math">

$$
E(k) = \mathcal{K} \varepsilon^{2/3} \left( \frac{k}{\varepsilon} \right)^{5/3}
$$

</div>

<strong>Wave phase:</strong>

<div class="display-math">

$$
\psi = kx - \omega t
$$

</div>

<strong>Wave elevation:</strong>

<div class="display-math">

$$
\eta = a \cos\psi
$$

</div>

<strong>Wave velocity potential:</strong>

<div class="display-math">

$$
\phi = \frac{a g}{\omega} \frac{\cosh[k(z + h)]}{\cosh(kh)} \sin\psi
$$

</div>

<strong>Wave orbital velocities:</strong>

<div class="display-math">

$$
u = \frac{\partial \phi}{\partial x} = - \frac{a \omega}{k} \frac{\cosh[k(z + h)]}{\cosh(kh)} \cos\psi
$$

</div>

<div class="display-math">

$$
w = \frac{\partial \phi}{\partial z} = \frac{a \omega}{k} \frac{\sinh[k(z + h)]}{\cosh(kh)} \sin\psi
$$

</div>

<strong>Wave particle displacements:</strong>

<div class="display-math">

$$
\zeta = \int u\ dt = - a e^{kz} \sin\psi
$$

</div>

<div class="display-math">

$$
\xi = \int w\ dt = a e^{kz} \cos\psi
$$

</div>

<strong>Wave orbital accelerations:</strong>

<div class="display-math">

$$
a_x = \frac{\partial u}{\partial t} = a \omega^2 e^{kz} \sin\psi
$$

</div>

<div class="display-math">

$$
a_z = \frac{\partial w}{\partial t} = - a \omega^2 e^{kz} \cos\psi
$$

</div>

<strong>Linear gravity wave dispersion:</strong>

<div class="display-math">

$$
\omega = \sqrt{g k \tanh(kh)}
$$

</div>

Deep water: $kh \to \infty$

<div class="display-math">

$$
\omega = \sqrt{g k}
$$

</div>

Shallow water: $kh \to 0$

<div class="display-math">

$$
\omega = \sqrt{gh} k
$$

</div>

<strong>Phase speed:</strong>

<div class="display-math">

$$
C_p = \frac{\omega}{k}
$$

</div>

Deep water: $kh \to \infty$

<div class="display-math">

$$
C_p = \sqrt{\frac{g}{k}}
$$

</div>

Shallow water: $kh \to 0$

<div class="display-math">

$$
C_p = \sqrt{gh}
$$

</div>

<strong>Group speed:</strong>

<div class="display-math">

$$
C_g = \frac{\partial \omega}{\partial k}
$$

</div>

Deep water: $kh \to \infty$

<div class="display-math">

$$
C_g = \frac{C_p}{2}
$$

</div>

Shallow water: $kh \to 0$

<div class="display-math">

$$
C_g = C_p
$$

</div>

<strong>Stokes drift (deep water):</strong>

<div class="display-math">

$$
u_{St} = a^2 \omega k e^{2kz}
$$

</div>

<strong>Wave energy balance:</strong>

<div class="display-math">

$$
\frac{\partial E}{\partial t} + \nabla \cdot \left( \mathbf{C_g} E \right) = 0
$$

</div>
