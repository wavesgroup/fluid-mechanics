---
title: "Surface gravity waves"
order: 10
number: "10"
kind: "chapter"
label: "sec:surface_gravity_waves"
---

In the previous chapter, we examined the structure of laminar and turbulent
boundary layers over a rigid, stationary, flat wall.
However, when the wind blows over the ocean surface, it generates waves that
make the ocean surface irregular and moving.
In this chapter, we study this "soft" and moving boundary between the atmosphere
and the ocean, that is, the wavy ocean surface.
The key restoring force for the surface waves, as we will soon see, is gravity,
and so these waves are often called <em>gravity waves</em>,
much like the waves we explored as a solution of the shallow water equations in
Chapter <a class="ref" data-key="sec:shallow_water_systems"></a>.
In the first part of this chapter, we derive the solution for the
small-amplitude (often called linear) waves, which is valid when the
wave amplitude is much smaller than the wavelength and the water depth.
This assumption allows for a relatively straightforward solution of the flow
anywhere below the free wavy surface.
Although simplistic in its approximations, the linear wave theory has been
surprisingly successful in predicting the behavior of the waves even when the
assumptions behind it are clearly violated.
The linear wave theory remains the basis of modern wave prediction models that
are used in operational weather and ocean forecasting.
After deriving the linear wave solutions, we will explore their properties
and derive some second-order quantities with implication for mean ocean
circulation.

## Small-amplitude wave derivation

Waves on the surface of a liquid have, within certain limits, an exact solution
for which many useful properties can be derived.
Modern ocean wave prediction models <cite data-keys="group1988wam, tolman1991third, booij1999third, donelan2012modeling" data-mode="paren"></cite> are based on this solution.

<span id="sec:governing_equations" class="sec-anchor"></span>

### Governing equations

Key assumptions are that the fluid is incompressible
($\nabla \cdot \mathbf{u} = 0$), inviscid ($\nu \nabla^2 \mathbf{u} = 0$),
and irrotational ($\nabla \times \mathbf{u} = 0$).
The inviscid assumption is required for the fluid to remain irrotational,
and the irrotational property allows expressing the velocity field in terms of a
scalar potential.
Incompressibility implies that this theory works well for liquids
(such as water on Earth or ancient Mars or liquid methane on Titan)
but not for gases.

In irrotational flows, velocity $\mathbf{u}$ has a scalar potential $\phi$
such that:

<div class="display-math">

$$
\mathbf{u} = \nabla \phi =
\frac{\partial \phi}{\partial x} \mathbf{i} +
\frac{\partial \phi}{\partial y} \mathbf{j} +
\frac{\partial \phi}{\partial z} \mathbf{k}
$$

</div>

Incompressibility then dictates that:

<div class="display-math" id="eq:laplace">

$$
\nabla \cdot \nabla \phi = \nabla^2 \phi = 0
$$

</div>

This is called the Laplace equation, and it holds throughout the fluid.
In two dimensions, horizontal and vertical, Eq. <a class="eqref" data-key="eq:laplace"></a> is:

<div class="display-math" id="eq:laplace_2d">

$$
\frac{\partial^2 \phi}{\partial x^2} + \frac{\partial^2 \phi}{\partial z^2} = 0
$$

</div>

which is sufficient if we consider surface waves that propagate in the
$x$-direction and that are otherwise uniform in the $y$-direction.

Although $\phi$ is allowed to vary in both space and time, the Laplace equation
states that at any given time, $\phi$ anywhere in the interior of the fluid is
determined by its values at the boundary (<em>i.e.</em> the boundary conditions).
It does not, however, determine how $\phi$ evolves in time.
One important property of the velocity potential is that it is not unique,
<em>i.e.</em> there are infinitely many functions that satisfy the Laplace
equation.
For example, if $\phi$ is a velocity potential, then so is $\phi + C$, where $C$
is a scalar constant, and so is $\phi + f(t)$, where $f(t)$ is an arbitrary
function of time.
Another one is that a sum of any number of velocity potentials is also a
velocity potential.

Now, to determine the time dependence of $\phi$, we integrate the Euler
equations of motion (introduced back in $\S$<a class="ref" data-key="sec:momentum"></a>, see
Eq. <a class="eqref" data-key="eq:momentum_euler"></a>) to obtain a steady-state relationship between the
pressure and the velocity of the fluid.
The Euler equations in $x$-$z$ plane are:

<div class="display-math" id="eq:euler_x">

$$
\frac{\partial u}{\partial t} +
u \frac{\partial u}{\partial x} +
w \frac{\partial u}{\partial z} =
- \frac{1}{\rho} \frac{\partial p}{\partial x}
$$

</div>

<div class="display-math" id="eq:euler_z">

$$
\frac{\partial w}{\partial t} +
u \frac{\partial w}{\partial x} +
w \frac{\partial w}{\partial z} =
- \frac{1}{\rho} \frac{\partial p}{\partial z}
- g
$$

</div>

Now, recall that we require the flow to be irrotational, so:

<div class="display-math">

$$
\omega = \frac{\partial w}{\partial x} - \frac{\partial u}{\partial z} = 0
$$

</div>

which leads to:

<div class="display-math">

$$
\frac{\partial w}{\partial x} = \frac{\partial u}{\partial z}
$$

</div>

We can use this to rewrite Eqs. <a class="eqref" data-key="eq:euler_x"></a>-<a class="eqref" data-key="eq:euler_z"></a> as:

<div class="display-math">

$$
\frac{\partial u}{\partial t} +
\frac{1}{2} \left( \frac{\partial u^2}{\partial x} + \frac{\partial w^2}{\partial x} \right) =
- \frac{1}{\rho} \frac{\partial p}{\partial x}
$$

</div>

<div class="display-math">

$$
\frac{\partial w}{\partial t} +
\frac{1}{2} \left( \frac{\partial u^2}{\partial z} + \frac{\partial w^2}{\partial z} \right) =
- \frac{1}{\rho} \frac{\partial p}{\partial z} - g
$$

</div>

Now, express the velocity components in the time derivatives as gradients of the
velocity potential:

<div class="display-math">

$$
\frac{\partial}{\partial x} \left[
\frac{\partial \phi}{\partial t} +
\frac{1}{2} \left(u^2 + w^2\right) +
\frac{p}{\rho}
\right] = 0
$$

</div>

<div class="display-math">

$$
\frac{\partial}{\partial z} \left[
\frac{\partial \phi}{\partial t} +
\frac{1}{2} \left(u^2 + w^2\right) +
\frac{p}{\rho}
\right] = -g
$$

</div>

Integrating these equations with respect to $x$ and $z$ respectively, we obtain:

<div class="display-math">

$$
\frac{\partial \phi}{\partial t} +
\frac{1}{2} \left(u^2 + w^2\right) +
\frac{p}{\rho} = C'(z, t)
$$

</div>

<div class="display-math">

$$
\frac{\partial \phi}{\partial t} +
\frac{1}{2} \left(u^2 + w^2\right) +
\frac{p}{\rho} = C(x, t) - gz
$$

</div>

where $C(x, t)$ and $C'(z, t)$ are integration constants that can vary in
dimensions other than their respective dimension of integration.
Since these equations have the same left-hand sides, their right-hand sides must
be equal:

<div class="display-math">

$$
C(x, t) = C'(z, t) + gz
$$

</div>

$C(x, t)$ thus can only depend on time, and we get our final equation form
called the <em>Bernoulli equation</em>:

<div class="display-math" id="eq:bernoulli">

$$
\frac{\partial \phi}{\partial t} +
\frac{1}{2} \left(u^2 + w^2\right) +
gz + \frac{p}{\rho}= C(t)
$$

</div>

The Bernoulli equation will serve as a dynamic free surface boundary condition
as we proceed to derive the solutions for the surface gravity waves.
At this time, notice also that the second and third term represent the kinetic
and potential energy, respectively.
This implies that the rate of change of the local value of the velocity potential
will be governed by the sum of the kinetic energy, potential energy, and pressure
energy per unit mass of the fluid.

<span id="sec:boundary_conditions" class="sec-anchor"></span>

### Boundary conditions

Now that we established the governing equations to solve, we need to specify the
boundary conditions to determine the velocity potential in the interior.
We will rely on a total of four boundary conditions:

1. <strong>Kinematic free surface boundary condition</strong>:
      This boundary condition determines the vertical velocity at the free surface
      $\eta(x, t)$ by exploiting the fact that the Lagrangian (material) change of
      the vertical position is the vertical velocity itself:

    <div class="display-math" id="eq:kfsbc">

    $$
    w = \frac{dz}{dt}\Big|_{z=\eta} = \frac{\partial \eta}{\partial t} + u \frac{\partial \eta}{\partial x}
    $$

    </div>

      Expressed in terms of the velocity potential, this boundary condition becomes:

    <div class="display-math">

    $$
    \frac{\partial \phi}{\partial z} =
    \frac{\partial \eta}{\partial t} +
    \frac{\partial \phi}{\partial x} \frac{\partial \eta}{\partial x}, \text{ at } z=\eta(x, t)
    $$

    </div>

2. <strong>Dynamic free surface boundary condition</strong>:
      We leverage the Bernoulli equation Eq. <a class="eqref" data-key="eq:bernoulli"></a> at the free surface
      ($z = \eta$) and set the surface pressure to be zero:

    <div class="display-math">

    $$
    \frac{\partial \phi}{\partial t} + \frac{1}{2} \left(u^2 + w^2\right) + g\eta = C(t), \text{ at } z=\eta(x, t)
    $$

    </div>

3. <strong>Bottom boundary condition</strong>:
      The bottom is rigid and impermeable, so the vertical velocity is zero at the
      bottom:

    <div class="display-math">

    $$
    w = 0, \text{ at } z = -h
    $$

    </div>

      where $h$ is the mean depth of the fluid.

4. <strong>Lateral boundary condition</strong>:
      At the lateral boundaries, since we're seeking a wave solution, we know that
      the velocity potential must be periodic in the horizontal space as well as
      time:

    <div class="display-math">

    $$
    \phi(x, t) = \phi(x+L, t)
    $$

    </div>

    <div class="display-math">

    $$
    \phi(x, t) = \phi(x, t+T)
    $$

    </div>

      where $L$ is the wavelength and $T$ is the period.

With these four boundary conditions, we are now equipped to solve for the velocity
potential in the interior of the fluid.

### Solution

Our key equation to solve is the Laplace equation (Eq. <a class="eqref" data-key="eq:laplace"></a>)
for the velocity potential $\phi$ that varies in the horizontal and vertical
direction $x$ and $z$ respectively, as well as time $t$:

<div class="display-math" id="eq:laplace2">

$$
\nabla^2 \phi(x, z, t) = 0
$$

</div>

To solve this equation, we will rely on the method of separation of variables,
where we assume that the solution can be written as a product of functions that
depend on each coordinate separately:

<div class="display-math">

$$
\phi(x, z, t) = \phi_x(x) \phi_z(z) \phi_t(t)
$$

</div>

We can start from the time-dependent part $\phi_t(t)$ and recall the lateral
boundary condition which states that the velocity potential must be periodic
in time, which is true for sines and cosines (and any linear combination of them).
For a sine function of a phase $\varphi$, this is true:

<div class="display-math">

$$
\sin(\varphi) = \sin(\varphi + 2\pi)
$$

</div>

And expressing it as a function of time:

<div class="display-math">

$$
\sin(\omega t) = \sin(\omega t + 2\pi)
$$

</div>

where $\omega$ is the angular frequency in units of radians per second, so that
the phase $\varphi$ has angle units (radians).
Notice that we could have picked (and soon, we will) a cosine function instead of
a sine function, and the solution would still be valid.
With the choice of a sine for the time-dependent part of the potential, we write
the full velocity potential as:

<div class="display-math" id="eq:phi1">

$$
\phi(x, z, t) = \phi_x(x) \phi_z(z) \sin(\omega t)
$$

</div>

Insert this into Eq. <a class="eqref" data-key="eq:laplace2"></a> to get:

<div class="display-math">

$$
\frac{\partial^2 \phi_x}{\partial x^2} \phi_z \sin(\omega t) +
\phi_x \frac{\partial^2 \phi_z}{\partial z^2} \sin(\omega t) = 0
$$

</div>

Divide by $\phi_x \phi_z \sin(\omega t)$ to get:

<div class="display-math" id="eq:phi2">

$$
\frac{1}{\phi_x} \frac{\partial^2 \phi_x}{\partial x^2} +
\frac{1}{\phi_z} \frac{\partial^2 \phi_z}{\partial z^2} = 0
$$

</div>

Can we separate this even further?
Recall that $\phi_x$ and $\phi_z$ are functions of $x$ and $z$ respectively.
If, for example, we hold $x$ constant and consider variations in $z$, the
first term would remain constant but the second term would not!
You can arrive to the same conclusion by holding $z$ constant and varying $x$.
This would clearly violate Eq. <a class="eqref" data-key="eq:phi2"></a>, and so the only way that
equation can hold is if both $\phi_x$ and $\phi_z$ are equal to the same
constant but with opposite signs:

<div class="display-math" id="eq:phi3">

$$
\frac{1}{\phi_x} \frac{\partial^2 \phi_x}{\partial x^2} = -k^2
$$

</div>

<div class="display-math" id="eq:phi4">

$$
\frac{1}{\phi_z} \frac{\partial^2 \phi_z}{\partial z^2} = k^2
$$

</div>

where $k$ is the separation constant.
These can also be written as:

<div class="display-math" id="eq:phi5">

$$
\frac{\partial^2 \phi_x}{\partial x^2} + k^2 \phi_x = 0
$$

</div>

<div class="display-math" id="eq:phi6">

$$
\frac{\partial^2 \phi_z}{\partial z^2} - k^2 \phi_z = 0
$$

</div>

For real values of $k$, the solutions to these equations are:

<div class="display-math">

$$
\phi_x(x) = A \sin(kx) + B \cos(kx)
$$

</div>

<div class="display-math" id="eq:phi_z">

$$
\phi_z(z) = C e^{kz} + D e^{-kz}
$$

</div>

where $A$, $B$, $C$, and $D$ are constants that are yet to be determined.
We now write our intermediate solution for the velocity potential as:

<div class="display-math" id="eq:phi_inter">

$$
\phi(x, z, t) = \left[ A \sin(kx) + B \cos(kx) \right] \left[ C e^{kz} + D e^{-kz} \right] \sin(\omega t)
$$

</div>

Next, let's attempt to constrain the $z$-dependent part of the potential,
$\phi_z(z) = C e^{kz} + D e^{-kz}$.
Recall the bottom boundary condition which for a flat bottom requires $w = 0$
at $z = -h$.
Then:

<div class="display-math">

$$
w = \frac{\partial \phi_z}{\partial z} = k \left( C e^{kz} - D e^{-kz} \right) = 0
$$

</div>

which implies $C = D e^{2kh}$.
Insert this back into Eq. <a class="eqref" data-key="eq:phi_z"></a> to get:

<div class="display-math">

$$
\begin{split}
\phi_z(z) &=
D \left( e^{2kh} e^{kz} + e^{-kz} \right) \\
&=
2 D e^{kh} \left( e^{k(z+h)} + e^{-k(z+h)} \right) \\
&=
2 D e^{kh} \cosh\left( k(z+h) \right)
\end{split}
$$

</div>

Inserting this back into Eq. <a class="eqref" data-key="eq:phi_inter"></a> we get:

<div class="display-math" id="eq:phi_inter2">

$$
\phi(x, z, t) = \left[ A \sin(kx) + B \cos(kx) \right] 2 D e^{kh} \cosh\left( k(z+h) \right) \sin(\omega t)
$$

</div>

Now, how about the free surface boundary condition?
Recall the Bernoulli equation at $z = \eta$ with $p = 0$:

<div class="display-math" id="eq:bernoulli_free_surface">

$$
\frac{\partial \phi}{\partial t} + \frac{1}{2} \left(u^2 + w^2\right) + g\eta = C(t), \text{ at } z=\eta(x, t)
$$

</div>

Denoting this equation as BE, we can evaluate it at the free surface $z = \eta$
using the Taylor expansion around $z = 0$:

<div class="display-math">

$$
BE_{z=\eta} = BE_{z=0} +
\eta \frac{\partial{BE}}{\partial z} +
\frac{1}{2} \eta^2 \frac{\partial^2{BE}}{\partial z^2} + \cdots
$$

</div>

To greatly simplify the algebra, this is where we invoke the small-amplitude
approximation, which effectively states that if $\eta \ll 1$, then
$\eta^2 \ll \eta$, $\eta \ll u \eta$, $u \ll u^2$, and so on.
This is where the <em>linearization</em> of the wave solution occurs, and it's
where it is possible to find wave solutions to a higher-order, such as those
of the Stokes wave theory.
For brevity, we keep only the first-order terms being the largest and write:

<div class="display-math">

$$
\left( \frac{\partial \phi}{\partial t} + g\eta \right)_{z=0} = C(t)
$$

</div>

and from here we have the expression for the free surface elevation as function
of the potential and time:

<div class="display-math">

$$
\eta = - \frac{1}{g} \left. \frac{\partial \phi}{\partial t} \right|_{z=0} + \frac{C(t)}{g}
$$

</div>

As by definition $\eta$ is a periodic displacement around the mean water level,
its spatial and temporal average is zero, so $C(t)$ must be zero as well,
assuming that the surface pressure is negligible and is dropped from the
Bernoulli equation.
The surface elevation is then:

<div class="display-math" id="eq:eta">

$$
\eta = - 2 D \frac{\omega}{g}e^{kh} \cosh{kh} \left[ A \cos(kx) + B \sin{kx} \right] \cos(\omega t)
$$

</div>

and so the constant $D$ must be such that the wave amplitude is:

<div class="display-math">

$$
a = - 2 D \frac{\omega}{g}e^{kh} \cosh{kh}
$$

</div>

and the constant $D$ is:

<div class="display-math">

$$
D = - \frac{a g}{2 \omega e^{kh} \cosh{kh}}
$$

</div>

Insert this back to our intermediate solution for the velocity potential
Eq. <a class="eqref" data-key="eq:phi_inter2"></a> and moving the minus sign into the $z$-dependent part
of the potential, we get:

<div class="display-math">

$$
\phi(x, z, t) = \frac{a g}{\omega} \frac{\cosh[k(h+z)]}{\cosh(kh)} \left[ A \sin(kx) + B \cos(kx) \right] \sin(- \omega t)
$$

</div>

which is our new intermediate solution for $\phi$.

Let's revisit again the lateral boundary conditions and recognize that
$\phi_x = A \cos(kx) + B \sin(kx)$, $\phi_x = A \cos(kx)$ and $\phi_x = B \sin(kx)$
are all valid solutions to the Laplace equation, which means that any combination
of them is a valid wave solution.
Same is true for $\phi_z$ where we chose a sine form, but we could have chosen
a cosine form instead, or some combination of the two.
This property of the velocity potential allows us to describe both standing
and progressive waves with the same functional form for $\phi$.
Specifically:

<div class="display-math">

$$
\phi(x, z, t) = \frac{a g}{\omega} \frac{\cosh[k(h+z)]}{\cosh(kh)} \cos(kx) \sin(- \omega t)
$$

</div>

is a valid velocity potential that belongs to a <em>standing wave</em> with
amplitude $a$.
Recognizing that both the sines and cosines are valid forms for the $x$- and
$t$-dependent parts of the velocity potential, and we can thus linearly combine
them to obtain a valid velocity potential that belongs to a progressive wave,
specifically:

<div class="display-math">

$$
\sin(kx) \cos(-\omega t) - \cos(kx) \sin(-\omega t) = \sin(kx - \omega t)
$$

</div>

A valid velocity potential that belongs to a <em>progressive wave</em> with
amplitude $a$ is then:

<div class="display-math" id="eq:wave_potential">

$$
\phi(x, z, t) = \frac{a g}{\omega} \frac{\cosh[k(h+z)]}{\cosh(kh)} \sin(kx - \omega t)
$$

</div>

The elevation that corresponds to this velocity potential is:

<div class="display-math" id="eq:wave_elevation">

$$
\eta = a \cos(kx - \omega t)
$$

</div>

Equations (<a class="eqref" data-key="eq:wave_potential"></a>) and (<a class="eqref" data-key="eq:wave_elevation"></a>) fully describe
the spatial and temporal evolution of a wave with amplitude $a$ and wavenumber
$k$ over mean water depth $h$.
The wave potential field for a linear, progressive gravity wave with $a = 0.1$ m
and $k = 1$ rad/m, and its corresponding elevation, are shown in Fig.
<a class="ref" data-key="fig:wave_potential"></a>.
The velocity potential for this wave has a positive maximum at the surface on
the front face of the wave and a negative minimum at the surface on the back face
of the wave.
The potential is largest at the surface and decays exponentially with depth.

<figure class="book-figure" id="fig:wave_potential">
  <img src="/figures/fig_wave_potential.png" alt="Wave elevation (black line) and velocity potential (color) for a linear wave with amplitude m and wavenumber rad m, in d" />
  <figcaption>

Wave elevation (black line) and velocity potential (color) for a linear wave with amplitude $a = 0.1$ m and wavenumber $k = 1$ rad m$^{-1}$, in deep water ($h = 100$ m). The mean water level ($z = 0$) is indicated by the horizontal dashed line. The wave is propagating from left to right.

  </figcaption>
</figure>

In the deep water limit, the wave potential can be written more concisely as:

<div class="display-math" id="eq:deep_water_wave_potential">

$$
\phi(x, z, t) = \frac{a g}{\omega} e^{kz} \sin(kx - \omega t)
$$

</div>

As we explore the wave kinematics, we will leverage this form for brevity.

## Dispersion of gravity waves

An important property of surface gravity waves is that they disperse, meaning
that waves of different frequencies (or wavenumbers) travel at different speeds.
A dispersion relationship describes how the wavenumber changes as function of
frequency.
To derive it, we leverage the kinematic free surface boundary condition
(Eq. <a class="eqref" data-key="eq:kfsbc"></a>), where, to the first order (recall our small-amplitude
approximation), we have:

<div class="display-math">

$$
w = \frac{\partial \phi}{\partial z}\Big|_{z=0} = \frac{\partial \eta}{\partial t}\Big|_{z=0}
$$

</div>

which leads to:

<div class="display-math">

$$
\frac{a g k}{\omega} \frac{\sinh(kh)}{\cosh(kh)} \sin(kx - \omega t) =
a \omega \sin(kx - \omega t)
$$

</div>

Simplifying on both sides, we arrive to:

<div class="display-math" id="eq:wave_dispersion">

$$
\omega^2 = g k \tanh(kh)
$$

</div>

which is the <em>dispersion relationship</em> for surface gravity waves.
Wavenumber as function of frequency is shown in Fig. <a class="ref" data-key="fig:wave_dispersion"></a>.

<figure class="book-figure" id="fig:wave_dispersion">
  <img src="/figures/fig_wave_dispersion.png" alt="Wavenumber as function of frequency for the surface gravity waves in deep ( m) water. The wavenumber range is from to ra" />
  <figcaption>

Wavenumber as function of frequency for the surface gravity waves in deep ($h = 1000$ m) water. The wavenumber range is from $k = 0.01$ to $k = 100$ rad/m. The corresponding frequency range is from approximately $0.05$ to $5$ Hz.

  </figcaption>
</figure>

<div class="interactive-slot" data-interactive="wave-dispersion"></div>

Let's now evaluate this dispersion relationship in the limits of shallow and
deep water.
In deep water, $kh \to \infty$ and so $\tanh(kh) \to 1$.
Then:

<div class="display-math">

$$
\omega^2 = g k \tanh(kh) \to g k
$$

</div>

So, in deep water, the frequency is not dependend on water depth, which we
expected–the rigid bottom is so far away from the free surface that the waves
don't feel it at all.
The frequency is dependent on the wavenumber and gravity only.
In contrast, in shallow water, $kh \to 0$ and so $\tanh(kh) \to kh$.
Then:

<div class="display-math">

$$
\omega^2 = g k \tanh(kh) \to g k^2 h
$$

</div>

or:

<div class="display-math">

$$
\omega = \sqrt{g h} k
$$

</div>

Here, the frequency depends on both the wavenumber and the water depth.
So, as waves enter progressively shallower water, their frequency decreases.
However, unlike in deep water where the frequency is nonlinearly dependent on
wavenumber, in shallow water they are linearly correlated by $\sqrt{g h}$.

An important wave property that directly follows from the dispersion
relationship is that for the <em>wave celerity</em>,
or <em>phase speed</em>, which is the speed at which the wave potential field
and elevation propagate in the horizontal direction:

<div class="display-math">

$$
C_p = \frac{\omega}{k} = \sqrt{\frac{g}{k} \tanh(kh)}
$$

</div>

Like the dispersion relationship itself, the expression for the phase speed
simplifies as well in the limits of shallow and deep water.
In deep water, $C_p = \sqrt{g/k}$, and in shallow water, $C_p = \sqrt{g h}$.
It is no coincidence that this is the same expression that we found for the
phase speed of Poincaré waves in the limit of negligible planetary rotation
(Eq. <a class="eqref" data-key="eq:shallow_water_phase_speed"></a>).

Before we close this section, let's remark on the fact that the dispersion
relation for waves in water of arbitrary depth (Eq. <a class="eqref" data-key="eq:wave_dispersion"></a>)
is nonlinear and transcendental in $k$ because of the hyperbolic tangent term.
This means that although evaluating the frequency given the wavenumber is
straightforward, the inverse problem of finding the wavenumber given the
frequency is not trivial and requires a numerical approximation or iteration.
Of course, both the deep and shallow water limits provide simple analytical
expressions for $k$ as function of $\omega$, but these are only valid in their
respective limits.

## Wave kinematics

With the velocity potential well defined in Eq. <a class="eqref" data-key="eq:deep_water_wave_potential"></a>,
the instantaneous wave-induced velocities can be readily obtained as:

<div class="display-math" id="eq:wave_horizontal_velocity">

$$
u = \frac{\partial \phi}{\partial x} = a \omega e^{kz} \cos(kx - \omega t)
$$

</div>

<div class="display-math" id="eq:wave_vertical_velocity">

$$
w = \frac{\partial \phi}{\partial z} = a \omega e^{kz} \sin(kx - \omega t)
$$

</div>

The wave-induced velocity thus have the following properties:

- It oscillates sinusoidally in both space and time, just like the wave
      elevation.

- The horizontal and vertical velocities are exactly $\pi/2$ out of phase
      in both space and time.

- Their magnitude scales with the wave amplitude and frequency, and decays
      exponentially with depth, their decay scale being proportional to $1/k$.

The horizontal velocity is in phase with the wave elevation, which means that
it reaches its maximum at the wave crest and minimum (maximum but in the
opposite direction) at the wave trough.
The vertical velocity is correspondingly positive and largest on the front face
of the wave (where the elevation is increasing with time) and negative and
largest in magnitude on the back face of the wave (where the elevation is
decreasing with time).
As an example, these velocities for a linear wave with amplitude $a = 0.1$ m
and wavenumber $k = 1$ rad m$^{-1}$, in deep water ($h = 100$ m), are shown in
Fig. <a class="ref" data-key="fig:wave_velocities"></a>.

<figure class="book-figure" id="fig:wave_velocities">
  <img src="/figures/fig_wave_velocities.png" alt="Wave elevation (black line) and horizontal (top) and vertical (bottom) velocities (color) for a linear wave with amplitu" />
  <figcaption>

Wave elevation (black line) and horizontal (top) and vertical (bottom) velocities (color) for a linear wave with amplitude $a = 0.1$ m and wavenumber $k = 1$ rad m$^{-1}$, in deep water ($h = 100$ m). Thin lines indicate the water particle trajectories.

  </figcaption>
</figure>

Now that we have the velocities, it is instructive to look at how the water
particles move in the wave field.
The horizontal and vertical displacements can be obtained by integrating their
respective velocities over time:

<div class="display-math" id="eq:wave_horizontal_displacement">

$$
\zeta = \int u\ dt = - a e^{kz} \sin(kx - \omega t)
$$

</div>

<div class="display-math" id="eq:wave_vertical_displacement">

$$
\xi = \int w\ dt = a e^{kz} \cos(kx - \omega t)
$$

</div>

The displacements are thus closed orbits when evaluated at any fixed depth $z$.

The wave-induced accelerations are also relevant because they govern the
wave-induced forces on submerged bodies.
They are simply a time derivative of the respective velocities:

<div class="display-math" id="eq:wave_horizontal_acceleration">

$$
a_x = \frac{\partial u}{\partial t} = a \omega^2 e^{kz} \sin(kx - \omega t)
$$

</div>

<div class="display-math" id="eq:wave_vertical_acceleration">

$$
a_z = \frac{\partial w}{\partial t} = - a \omega^2 e^{kz} \cos(kx - \omega t)
$$

</div>

Accelerations are a common measurement of ocean surface waves, especially on
freely drifting platforms.

## Mean Lagrangian velocity

It's clear that averaging the instantaneous orbital velocities at any given
fixed depth $z$ over one or more period yields zero.
However, if we follow the water particles in Lagrangian sense, their average
horizontal velocity will be non-zero because the particles move forward a larger
distance than backward over the course of one period.
This mean Lagrangian velocity is called the
<em>Stokes drift</em>.
We can find the expression for this mean residual drift by first recognizing
that we can approximate the velocity at a particle position $(x+\zeta, z+\xi)$
to the first order as:

<div class="display-math">

$$
u(x+\zeta, z+\xi, t) = u(x,z,t) +
\frac{\partial u}{\partial x} \zeta +
\frac{\partial u}{\partial z} \xi \\
$$

</div>

<div class="display-math">

$$
u(x+\zeta, z+\xi, t) = u(x,z,t) +
a^2 \omega k e^{2kz} \sin^2(kx - \omega t) + a^2 \omega k e^{2kz} \cos^2(kx - \omega t)
$$

</div>

<div class="display-math">

$$
u(x+\zeta, z+\xi, t) = u(x,z,t) + a^2 \omega k e^{2kz}
$$

</div>

The Stokes drift can then be obtained by averaging this material velocity over
one period:

<div class="display-math">

$$
u_{St} = \frac{1}{T} \int_0^T u(x+\zeta, z+\xi, t)\ dt = a^2 \omega k e^{2kz}
$$

</div>

It can be easily shown by following the same procedure for the vertical velocity
that the vertical Stokes drift is zero.

Relative to the instantaneous orbital velocity, the Stokes drift has an
addition factor of $ak$ (wave steepness), and it decays with depth twice as fast
as the orbital velocity.
This means that the Stokes drift induced by short waves is also confined to the
near surface, whereas only longer waves such as swell can induce significant
Stokes drift at the depth of several meters or more.

Although the Stokes drift has dimensions of velocity, it is not a true velocity
at any given instant in time, but rather a mean Lagrangian drift of water
particles.
It thus cannot be directly measured with an Eulerian current meter, but instead
can be inferred by tracking the trajectories of drifting buoys or surface
floats.
Fig. <a class="ref" data-key="fig:stokes_drift_glad"></a>, from <cite data-keys="curcic2016hurricane" data-mode="narrative"></cite>, shows
trajectories of a five member cluster of surface drifters deployed during the
GLAD experiment in the Gulf of Mexico in August 2012, in the aftermath of
Hurricane Isaac.
The observed drifter trajectories (black) are compared with simulated
trajectories using only the Eulerian ocean current (green) and using the
ocean current plus the Stokes drift (red).
The inclusion of the Stokes drift significantly improves the agreement between
the observed and simulated drifter trajectories, especially in the strongly
forced region on the right side of the hurricane track.
Although not exactly a measurement of the Stokes drift itself, it illustrates
in a qualitative sense that the wave-induced Lagrangian drift contributed
significantly to the final observed displacement of the drifters.
This was also the first documented inference of Stokes drift in hurricane
conditions.

<figure class="book-figure" id="fig:stokes_drift_glad">
  <img src="/figures/fig_stokes_drift_glad.jpg" alt="Trajectories of a five member cluster located in a strongly forced region on the right side of Hurricane Isaac track fro" />
  <figcaption>

Trajectories of a five member cluster located in a strongly forced region on the right side of Hurricane Isaac track from 0000 UTC 27 to 30 August 2012. Observed (black) and simulated trajectories using the Eulerian (green; ocean current without Stokes drift) and Lagrangian (red; ocean current with Stokes drift) velocities started at the same initial positions as the GLAD drifters. The dots mark drifter locations valid on the time indicated on top of each panel. The color background shows simulated surface seawater density minus $10^3$ $kg\ m^{-3}$. Adapted from <cite data-keys="curcic2016hurricane" data-mode="narrative"></cite>.

  </figcaption>
</figure>

## Wave groups

Waves of a given wavenumber and frequency are rarely alone and in reality the
ocean surface is densely populated by a spectrum of waves with different
wavenumbers and frequencies.
The simplest case of this is if we considered two waves and their resulting
elevation:

<div class="display-math" id="eq:wave_group_elevation">

$$
\eta = \eta_1 + \eta_2 = a \cos(k_1 x - \omega_1 t) + a \cos(k_2 x - \omega_2 t)
$$

</div>

Superposing two waves with different wavenumbers leads to the formation
of wave groups (Fig. <a class="ref" data-key="fig:wave_group"></a>).

<figure class="book-figure" id="fig:wave_group">
  <img src="/figures/fig_wave_group.png" alt="Superposition of two waves with wavenumbers 1 and 1.1 rad/m and amplitudes of 0.1 m." />
  <figcaption>

Superposition of two waves with wavenumbers 1 and 1.1 rad/m and amplitudes of 0.1 m.

  </figcaption>
</figure>

Now, to see at what speed does the wave group propagate, write the wavenumbers
and frequencies of independent waves as:

<div class="display-math">

$$
k_1 = k - \frac{\Delta k}{2}
$$

</div>

<div class="display-math">

$$
\omega_1 = \omega - \frac{\Delta \omega}{2}
$$

</div>

<div class="display-math">

$$
k_2 = k + \frac{\Delta k}{2}
$$

</div>

<div class="display-math">

$$
\omega_2 = \omega + \frac{\Delta \omega}{2}
$$

</div>

Then, Eq. <a class="eqref" data-key="eq:wave_group_elevation"></a> can be rewritten as:

<div class="display-math">

$$
\eta = a \cos \left[ \frac{1}{2} [(k_1 + k_2)x - (\omega_1 + \omega_2)t] \right]
\cos \left[ \frac{1}{2} [(k_1 - k_2)x - (\omega_1 - \omega_2)t] \right]
$$

</div>

which is equivalent to:

<div class="display-math">

$$
\eta = a \cos(kx - \omega t) \cos\left[\frac{1}{2} \Delta k \left(x - \frac{\Delta \omega}{\Delta k} t \right) \right]
$$

</div>

This form corresponds to individual waves moving with phase speed $C_p = \omega/k$,
and the envelope moving with the so-called <em>group speed</em>:

<div class="display-math" id="eq:group_speed">

$$
C_g = \frac{\Delta \omega}{\Delta k} \approx \frac{\partial \omega}{\partial k}, \text{ for } \Delta k \to 0
$$

</div>

Notice that the group speed of gravity waves approaches half the phase speed
in the deep water limit, and is equal to the phase speed in shallow water.
Group speed of gravity waves is important because it is the advective speed of
wave energy as well:

<div class="display-math" id="eq:wave_energy_advection">

$$
\frac{d E}{dt} = \frac{\partial E}{\partial t} + \nabla \cdot (\mathbf{C}_g E) = 0
$$

</div>

This equation is called the wave energy balance and it is the key governing
equation in most ocean wave prediction models.

## Exercises

1. A small drifter is floating on the surface of a deep-water wave with
      the wavenumber $k = 1\ rad/m$ and amplitude $a = 0.1\ m$.
      Assuming the mean gravitational acceleration is $g = 9.8\ m/s^2$,
      calculate the acceleration that the drifter's on board accelerometer will
      measure at the crest and in the trough of the wave.

2. Two wavetrains with wavenumbers $k_1 = 0.1\ rad/m$ and
      $k_2 = 1\ rad/m$ and amplitudes $a_1 = 1\ m$ and $a_2 = 0.2\ m$ are
      propagating in the same direction in deep water.
      If the shorter wave is riding on the surface of the longer wave and is
      subject to the acceleration induced by the longer wave, what is (a) the phase
      speed of the short wave at the crest and in the trough of the long wave,
      and (b) the maximum horizontal orbital velocity at the surface of the short
      wave? Assume that the mean gravitational acceleration is $g = 9.8\ m/s^2$ and
      that $k_2$ remains constant.

3. Starting from the expressions for the wave-induced orbital velocities
      (Eqs. <a class="eqref" data-key="eq:wave_horizontal_velocity"></a> and <a class="eqref" data-key="eq:wave_vertical_velocity"></a>),
      show that the vertical component of the mean Lagrangian velocity
      (<em>i.e.</em>, the vertical Stokes drift) is zero.

## Summary

In this chapter, we covered:

- The derivation of small-amplitude (linear) wave theory;

- The dispersion relationship for surface gravity waves;

- The wave kinematics and mean Lagrangian (Stokes) drift;

- Wave groups and wave energy balance.
