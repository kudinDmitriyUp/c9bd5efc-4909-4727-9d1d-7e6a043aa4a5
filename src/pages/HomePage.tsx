import HeroTwinCarStage from "@/components/sections/hero/HeroTwinCarStage";
import AboutTwinCarIntro from "@/components/sections/about/AboutTwinCarIntro";
import MetricsTwinCarFigures from "@/components/sections/metrics/MetricsTwinCarFigures";
import ProcessAeroPressure from "@/components/sections/features/ProcessAeroPressure";
import FeaturesCarAnatomy from "@/components/sections/features/FeaturesCarAnatomy";
import ProductPaintTurntable from "@/components/sections/product/ProductPaintTurntable";
import FeaturesTwinCompare from "@/components/sections/features/FeaturesTwinCompare";
import CtaTwinCarSwap from "@/components/sections/statement/CtaTwinCarSwap";
import CarDuoStage from "@/components/kit/CarDuoStage";
import LoaderStudioWarmup from "@/components/loaders/LoaderStudioWarmup";

export default function HomePage() {
  return (
    <>
      <CarDuoStage
        label="Choose a car"
        switchAfterIntro
        cars={[
          {
            name: "911 Turbo S",
            code: "911",
            src: "https://storage.googleapis.com/webild/default/templates/sports-car-brand/911.glb",
            length: 4.535,
            paintMaterial: "body_main",
            wheels: "wheel_rim|tire_main|discs_Discs",
            tail: "^red_light_main$",
            paint: {
              color: "rgb(166, 171, 175)",
              metalness: 0.8,
              roughness: 0.28
            },
            topSpeed: 330,
            downforce: 170,
            engine: [
              -1.7,
              0.8,
              0
            ],
            cockpit: [
              0.1,
              1,
              0.2
            ]
          },
          {
            name: "918 Spyder",
            code: "918",
            src: "https://storage.googleapis.com/webild/default/templates/sports-car-brand/918.glb",
            length: 4.643,
            turn: 1.5707963267948966,
            paintMaterial: "Body_Paint_-_GT_Silver_Metalic",
            wheels: "DEF-?Wheel(?!Brake)",
            paint: {
              color: "rgb(179, 184, 188)",
              metalness: 0.9,
              roughness: 0.22
            },
            accent: "rgb(147, 192, 31)",
            topSpeed: 345,
            downforce: 240,
            engine: [
              -0.7,
              0.9,
              0
            ],
            cockpit: [
              0.3,
              0.95,
              0.2
            ]
          }
        ]}
      />

      <LoaderStudioWarmup
        label="Warming up"
        errorLabel="Could not load the cars"
      />

      <div id="hero" data-webild-section="HeroTwinCarStage" data-webild-section-id="HeroTwinCarStage-1" data-section="hero" className="relative z-[1]" data-scene>
        <HeroTwinCarStage
          cars={[
            {
              title: "Born at",
              titleMuted: "330 km/h",
              description: "The 911 Turbo S. Six cylinders behind you, two turbochargers, and a car you could drive to work on Monday."
            },
            {
              title: "Born at",
              titleMuted: "345 km/h",
              description: "The 918 Spyder. A V8 and two electric motors, 887 PS between them, and only 918 ever built."
            }
          ]}
          primaryButton={{
            text: "Compare both",
            href: "#features"
          }}
          scrollLabel="Scroll"
        />
      </div>

      <div id="about" data-webild-section="AboutTwinCarIntro" data-webild-section-id="AboutTwinCarIntro-1" data-section="about" className="relative z-[1]">
        <AboutTwinCarIntro
          label="The idea"
          cars={[
            {
              title: "Sixty years",
              titleEnd: "of one idea",
              description: "The engine has stayed behind the rear axle since 1963. Everything else has been rethought around that one stubborn decision, until a rear-engined coupé became one of the fastest cars on the road."
            },
            {
              title: "The hybrid",
              titleEnd: "that broke 7",
              description: "In 2013 the 918 lapped the Nürburgring Nordschleife in 6:57, the first road car under seven minutes. It did it with a battery on board and the engine in the middle."
            }
          ]}
        />
      </div>

      <div id="metrics" data-webild-section="MetricsTwinCarFigures" data-webild-section-id="MetricsTwinCarFigures-1" data-section="metrics" className="relative z-[1]" data-scene>
        <MetricsTwinCarFigures
          label="By the numbers"
          items={[
            {
              label: "Power",
              suffix: "PS",
              values: [
                650,
                887
              ]
            },
            {
              label: "Torque",
              suffix: "Nm",
              values: [
                800,
                1280
              ]
            },
            {
              label: "0–100 km/h",
              suffix: "s",
              values: [
                2.7,
                2.6
              ],
              decimals: 1
            },
            {
              label: "Top speed",
              suffix: "km/h",
              values: [
                330,
                345
              ]
            },
            {
              label: "Weight",
              suffix: "kg",
              values: [
                1640,
                1634
              ]
            }
          ]}
        />
      </div>

      <div id="process" data-webild-section="ProcessAeroPressure" data-webild-section-id="ProcessAeroPressure-1" data-section="process" className="relative z-[1]" data-scene>
        <ProcessAeroPressure
          label="Aerodynamics"
          title="Where the"
          titleEnd="air"
          titleMuted="hits"
          cars={[
            {
              items: [
                {
                  title: "Stagnation",
                  description: "At the nose the air stops dead. Highest pressure on the whole car."
                },
                {
                  title: "Over the roof",
                  description: "The flow speeds up over the glass and roof, and the pressure drops. That suction is lift."
                },
                {
                  title: "The tail",
                  description: "The active rear wing rises with speed, and the front spoiler deploys in three stages. Together they pull the car into the road."
                }
              ]
            },
            {
              items: [
                {
                  title: "Stagnation",
                  description: "At the nose the air stops dead. Highest pressure on the whole car."
                },
                {
                  title: "Over the roof",
                  description: "The flow speeds up over the glass and roof, and the pressure drops. That suction is lift."
                },
                {
                  title: "The tail",
                  description: "In race mode the rear wing tilts steeper and the underbody flaps open, adding grip right where the hybrid system needs it."
                }
              ]
            }
          ]}
          legendLabel="Surface pressure"
          lowLabel="Suction"
          highLabel="Pressure"
          speedLabel="km/h air"
          forceLabel="kg downforce (est.)"
        />
      </div>

      <div id="services" data-webild-section="FeaturesCarAnatomy" data-webild-section-id="FeaturesCarAnatomy-1" data-section="services" className="relative z-[1]" data-scene>
        <FeaturesCarAnatomy
          cars={[
            {
              items: [
                {
                  title: "Ceramic",
                  titleEnd: "stopping power",
                  label: "Front brake",
                  description: "Carbon-ceramic brakes behind 21-inch rear wheels, with ten-piston calipers at the front. They shrug off lap after lap without fading."
                },
                {
                  title: "Flat-six,",
                  titleEnd: "twin turbo",
                  label: "Engine",
                  description: "3.7 litres, two variable-geometry turbochargers, 650 PS. It sits behind the rear axle, where it has always been."
                },
                {
                  title: "A cabin",
                  titleEnd: "for every day",
                  label: "Cockpit",
                  description: "Two proper seats, a usable boot and air conditioning that works. The fastest 911 is still the one you can live with."
                }
              ]
            },
            {
              items: [
                {
                  title: "Wheels",
                  titleEnd: "in acid green",
                  label: "Front brake",
                  description: "Magnesium wheels, carbon-ceramic discs and the acid-green calipers that marked every Porsche hybrid of the era."
                },
                {
                  title: "V8 plus",
                  titleEnd: "two motors",
                  label: "Engine",
                  description: "A 4.6-litre V8 from the RS Spyder race car, plus an electric motor on each axle. 887 PS and 1,280 Nm combined."
                },
                {
                  title: "Top-exit",
                  titleEnd: "exhausts",
                  label: "Cockpit",
                  description: "The exhaust pipes leave through the top of the engine cover, straight above the V8, so the hot gas never touches the bodywork."
                }
              ]
            }
          ]}
        />
      </div>

      <div id="product" data-webild-section="ProductPaintTurntable" data-webild-section-id="ProductPaintTurntable-1" data-section="product" className="relative z-[1]" data-scene>
        <ProductPaintTurntable
          label="Colour"
          title="Pick its"
          titleMuted="skin"
          cars={[
            {
              items: [
                {
                  name: "GT Silver",
                  color: "rgb(166, 171, 175)",
                  metalness: 0.8,
                  roughness: 0.28
                },
                {
                  name: "Guards Red",
                  color: "rgb(192, 18, 28)",
                  metalness: 0.35,
                  roughness: 0.3
                },
                {
                  name: "Gentian Blue",
                  color: "rgb(29, 53, 102)",
                  metalness: 0.55,
                  roughness: 0.3
                },
                {
                  name: "Chalk",
                  color: "rgb(208, 204, 195)",
                  metalness: 0.15,
                  roughness: 0.36
                },
                {
                  name: "Jet Black",
                  color: "rgb(12, 13, 15)",
                  metalness: 0.6,
                  roughness: 0.26
                },
                {
                  name: "Carbon",
                  color: "rgb(20, 21, 23)",
                  metalness: 0.3,
                  roughness: 0.3,
                  carbon: true
                }
              ]
            },
            {
              items: [
                {
                  name: "Liquid Metal Silver",
                  color: "rgb(179, 184, 188)",
                  metalness: 0.9,
                  roughness: 0.22
                },
                {
                  name: "Acid Green",
                  color: "rgb(169, 214, 31)",
                  metalness: 0.3,
                  roughness: 0.3
                },
                {
                  name: "Guards Red",
                  color: "rgb(192, 18, 28)",
                  metalness: 0.35,
                  roughness: 0.3
                },
                {
                  name: "Arrow Blue",
                  color: "rgb(42, 99, 201)",
                  metalness: 0.5,
                  roughness: 0.3
                },
                {
                  name: "Black",
                  color: "rgb(12, 13, 15)",
                  metalness: 0.6,
                  roughness: 0.26
                },
                {
                  name: "Carbon",
                  color: "rgb(20, 21, 23)",
                  metalness: 0.3,
                  roughness: 0.3,
                  carbon: true
                }
              ]
            }
          ]}
        />
      </div>

      <div id="features" data-webild-section="FeaturesTwinCompare" data-webild-section-id="FeaturesTwinCompare-1" data-section="features" className="relative z-[1]">
        <FeaturesTwinCompare
          label="Versus"
          title="Two ways"
          titleEnd="to"
          titleMuted="300"
          description="One is the everyday weapon, refined over sixty years. The other is a hybrid hypercar built in a run of 918. Switch between them; the whole page follows."
          columns={[
            "911 Turbo S",
            "918 Spyder"
          ]}
          rows={[
            {
              label: "Engine",
              values: [
                "Twin-turbo flat-six",
                "V8 + two e-motors"
              ]
            },
            {
              label: "Power",
              values: [
                "650 PS",
                "887 PS"
              ]
            },
            {
              label: "Torque",
              values: [
                "800 Nm",
                "1,280 Nm"
              ]
            },
            {
              label: "0–100 km/h",
              values: [
                "2.7 s",
                "2.6 s"
              ]
            },
            {
              label: "Top speed",
              values: [
                "330 km/h",
                "345 km/h"
              ]
            },
            {
              label: "Layout",
              values: [
                "Rear engine, AWD",
                "Mid engine, AWD"
              ]
            },
            {
              label: "Built",
              values: [
                "In series",
                "918 units"
              ]
            }
          ]}
          buttonText="Switch car"
        />
      </div>

      <div id="cta" data-webild-section="CtaTwinCarSwap" data-webild-section-id="CtaTwinCarSwap-1" data-section="cta" className="relative z-[1]" data-scene>
        <CtaTwinCarSwap
          hold={false}
          cars={[
            {
              label: "The everyday weapon",
              title: "Drive it",
              titleMuted: "daily",
              buttonText: "Drive the 918"
            },
            {
              label: "The hypercar",
              title: "Only",
              titleMuted: "918",
              buttonText: "Drive the 911"
            }
          ]}
        />
      </div>
    </>
  );
}
