import Files from ".././../../utils/Files";

function Welcome() {
  return (
    <div className="w-full max-w-lg">
      <div className="mb-8 flex items-center sm:mb-10">
        <h2 className="ml-3 text-xl font-semibold"> </h2>
      </div>

      <img
        src={Files.WELCOME_IMG}
        alt="WELCOME"
        className="mx-auto mb-8 w-full max-w-[410px] object-contain sm:mb-12"
      />

      <h2 className="mt-8 text-3xl font-normal tracking-tight text-foreground sm:mt-10 sm:text-4xl">
        One calm space for your team's work.
      </h2>

      <p className="py-5 text-gray-500 sm:py-6 text-10px">
        Files, conversations and tasks together in one place. Stay organized and
        work faster with your team.
      </p>
    </div>
  );
}

export default Welcome;
