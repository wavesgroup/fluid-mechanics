---
title: "Fluid kinematics"
order: 3
number: "3"
kind: "chapter"
---

Fluid kinematics describe the fluid motion without considering the forces that
cause that motion.
We will explore two main views of the flow: the <em>Lagrangian</em>
view, which follows individual fluid particles, and the <em>Eulerian</em>
view, which observes the flow at fixed points in space.
Although the Eulerian (fixed-point) view is more commonly used in the theory and simulation
of fluid flows, the Lagrangian (particle-following) view will be essential when
deriving some of the fundamental equations, as well as for understanding where
certain features of the flow come from.
Both approaches are often used together in numerical simulations.
Flows are typically simulated in the Eulerian framework on a fixed
grid, and for many applications the flow is analyzed <em>a posteriori</em>
and/or visualized in the Lagrangian framework.
For example, picture a high-speed flow simulation around an aircraft
that is modeled on a fixed grid, and particle-following trajectories drawn to
visualize the turbulent wake behind the vessel.
Another example is the Lagrangian evolution of an oil spill in the ocean or
a volcanic plume in the atmosphere, derived from Eulerian simulation output.

We will also introduce some useful concepts to describe the flow, namely
the <em>velocity potential</em> and the <em>stream function</em>.
These two scalar quantities are complementary to the vector field of velocity
and together provide a complete description of the flow.

## Lagrangian and Eulerian derivatives of a fluid property

We will start by first drawing a distinction between the Lagrangian and Eulerian
derivatives.
Consider a 3-dimensional quantity $\varphi$ that varies in space and time such
that $\varphi = \varphi(x, y, z, t)$.
This can be a scalar, a vector, or a tensor, however, to keep things simple,
suppose $\varphi$ is a scalar field.
Let's find its rate of change.
Since it depends on $x$, $y$, $z$, and $t$, the rate of change of $\varphi$ along
each of these dimensions must be taken into account.
So, the total change of $\varphi$ (let's call it $\delta\varphi$, where $\delta$
is a small but finite increment) over spatial and temporal increments $\delta x$,
$\delta y$, $\delta z$, and $\delta t$, is the sum of changes along each of
these dimensions:

<div class="display-math">

$$
\delta\varphi = \frac{\partial \varphi}{\partial x} \delta x +
\frac{\partial \varphi}{\partial y} \delta y +
\frac{\partial \varphi}{\partial z} \delta z +
\frac{\partial \varphi}{\partial t} \delta t
$$

</div>

Divide by $\delta t$ to obtain:

<div class="display-math">

$$
\frac{\delta\varphi}{\delta t} = \frac{\partial \varphi}{\partial x} \frac{\delta x}{\delta t} +
\frac{\partial \varphi}{\partial y} \frac{\delta y}{\delta t} +
\frac{\partial \varphi}{\partial z} \frac{\delta z}{\delta t} +
\frac{\partial \varphi}{\partial t}
$$

</div>

Recall the definition of $\nabla$ (Eq. <a class="eqref" data-key="eq:nabla"></a>) and let the finite
increment $\delta t$ approach $dt$ (and likewise for $\delta x$, $\delta y$, and
$\delta z$), to obtain:

<div class="display-math">

$$
\frac{d\varphi}{dt} = \frac{\partial \varphi}{\partial x} \frac{dx}{dt} +
\frac{\partial \varphi}{\partial y} \frac{dy}{dt} +
\frac{\partial \varphi}{\partial z} \frac{dz}{dt} +
\frac{\partial \varphi}{\partial t}
$$

</div>

The above is equivalent to applying the chain rule to $\varphi$ with respect
to time and assuming that the spatial dimension variables are functions of time
($\varphi = \varphi(x(t), y(t), z(t), t)$).
Recognize that by stating the dependence of position on time, we are implicitly
stating that we are following a fluid particle.
Then, recognize that the velocity in each direction is the rate of change of
the position in that direction:

<div class="display-math">

$$
\frac{d\varphi}{dt} =
\frac{\partial \varphi}{\partial t} +
u \frac{\partial \varphi}{\partial x} +
v \frac{\partial \varphi}{\partial y} +
w \frac{\partial \varphi}{\partial z}
$$

</div>

which states that the total change of $\varphi$ is due to the local (at fixed
point in space) change over time, and due to spatial variations of $\varphi$ as
the fluid particle moves through them.
Finally, recall the definition of $\nabla$ (Eq. <a class="eqref" data-key="eq:nabla"></a>) to obtain:

<div class="display-math" id="eq:lagrangian_derivative">

$$
\frac{d\varphi}{dt} = \frac{\partial \varphi}{\partial t} + \mathbf{u} \cdot \nabla \varphi
$$

</div>

The term $\frac{d\varphi}{dt}$ is called the <em>total derivative</em>
of $\varphi$. It is also called a <em>Lagrangian derivative</em>,
or <em>material derivative</em>, since it follows
the motion of a fluid particle.
The term $\frac{\partial \varphi}{\partial t}$ is called the
<em>Eulerian derivative</em>,
or <em>partial derivative</em>
of $\varphi$ with respect to time.
The term $\mathbf{u} \cdot \nabla \varphi$ describes how $\varphi$ changes due
to its spatial variation and the flow of the fluid.

Although the term $\mathbf{u} \cdot \nabla \varphi$ is the dot product of
$\mathbf{u}$ and $\nabla \varphi$, the Lagrangian derivative in Eq.
<a class="eqref" data-key="eq:lagrangian_derivative"></a> can be expressed as an operator:

<div class="display-math">

$$
\frac{d}{dt} = \frac{\partial}{\partial t} + (\mathbf{u} \cdot \nabla)
$$

</div>

The parentheses on the right-hand side indicate that that term acts as an
operator on a field.
Like we stated for the operator $\nabla$ in the previous chapter, the total
derivative operator $\frac{d}{dt}$ cannot stand on its own, but is instead
applied to a field.

## Lagrangian derivative of a volume

Consider a fluid parcel with a constant mass but whose volume may change over
time and is $\int_V dV = V$.
The total rate of change of that volume as it moves with the fluid is equal to
the surface integral of the velocity field $\mathbf{u}$ through the surface
$S$ that is bounding the volume $V$:

<div class="display-math">

$$
\frac{d}{dt}\int_V dV = \int_S \mathbf{u} \cdot d\mathbf{S}
$$

</div>

Recall now the divergence theorem (Eq. <a class="eqref" data-key="eq:divergence_theorem"></a>) to obtain:

<div class="display-math">

$$
\frac{d}{dt}\int_V dV = \int_V \nabla \cdot \mathbf{u} dV
$$

</div>

Now, for a volume parcel so small that $\int_V dV = \Delta V \to 0$, the
velocity divergence can be considered to be constant over the volume, and the
integral can be replaced by the volume itself:

<div class="display-math" id="eq:lagrangian_volume_derivative">

$$
\frac{d\Delta V}{dt} = \Delta V \nabla \cdot \mathbf{u}
$$

</div>

We can derive a similar expression for the rate of change of a fluid property
per unit volume $q$, such that $q \Delta V$ is the amount of that quantity in
a fluid parcel with the volume $\Delta V$.

<div class="display-math">

$$
\frac{d}{dt} (q \Delta V) = \Delta V \frac{dq}{dt} + q \frac{d\Delta V}{dt}
$$

</div>

Recall the material derivative of $\Delta V$ from Eq. <a class="eqref" data-key="eq:lagrangian_volume_derivative"></a>
to obtain:

<div class="display-math">

$$
\frac{d}{dt} (q \Delta V) = \Delta V \frac{dq}{dt} + q \Delta V \nabla \cdot \mathbf{u}
$$

</div>

<div class="display-math" id="eq:lagrangian_property_derivative">

$$
\frac{d}{dt} (q \Delta V) = \Delta V \left( \frac{dq}{dt} + q \nabla \cdot \mathbf{u} \right)
$$

</div>

This was for a fluid property that is defined per unit volume.
Let's now do the same for some property $\varphi$ that is defined per unit mass,
such that $\varphi \rho \Delta V$ is the amount of that quantity in the fluid
parcel with the volume $\Delta V$ and density $\rho$ (and mass $\rho \Delta V$).

<div class="display-math" id="eq:lagrangian_property_per_mass_derivative">

$$
\frac{d}{dt} (\varphi \rho \Delta V) = \rho \Delta V \frac{d\varphi}{dt} + \varphi \frac{d(\rho \Delta V)}{dt}
$$

</div>

However recall that our fluid parcel has constant mass, so $\frac{d(\rho \Delta V)}{dt} = 0$.
Our total derivative becomes:

<div class="display-math">

$$
\frac{d}{dt} (\varphi \rho \Delta V) = \rho \Delta V \frac{d\varphi}{dt}
$$

</div>

The Lagrangian derivative of a volume will come in handy when we derive the
continuity equation in the next chapter.

## Velocity potential

Velocity potential is defined as a scalar field $\phi$ such that the velocity
field $\mathbf{u}$ is the gradient of $\phi$:

<div class="display-math">

$$
\mathbf{u} = \nabla \phi =
\begin{bmatrix}
\frac{\partial \phi}{\partial x} \\
\frac{\partial \phi}{\partial y} \\
\frac{\partial \phi}{\partial z}
\end{bmatrix}
$$

</div>

The concept of the velocity potential is useful in fluid mechanics because it is
often easier to work with a scalar field than a vector field.
We will revisit it later in Chapter <a class="ref" data-key="sec:surface_gravity_waves"></a> when we
derive the equations of surface gravity waves.

## Summary

In this chapter, we covered:

- Lagrangian (material) and Eulerian (field) derivatives;
      the former follows a fluid parcel of constant mass as it moves through
      the flow field, while the latter is the rate of change at a fixed point
      (or volume) in space;

- The Lagrangian derivative of volume, as well as of a fluid property per
      unit volume and per unit mass.

We'll use these concepts in the next chapter where we derive the equations of
continuity and motion.
