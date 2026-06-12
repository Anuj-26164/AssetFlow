import * as bookingService from "../services/bookingService.js";

export async function create(req, res) {
  const booking = await bookingService.createBooking(req.user.id, req.body);
  res.status(201).json({ booking });
}

export async function listMine(req, res) {
  const bookings = await bookingService.listMyBookings(req.user.id, req.validatedQuery ?? {});
  res.json({ bookings });
}

export async function listAll(req, res) {
  const bookings = await bookingService.listAllBookings(req.validatedQuery ?? {});
  res.json({ bookings });
}

export async function getOne(req, res) {
  const booking = await bookingService.getBookingForUser(req.params.id, req.user);
  res.json({ booking });
}

export async function cancel(req, res) {
  const booking = await bookingService.cancelBooking(req.params.id, req.user);
  res.json({ booking });
}

export async function approve(req, res) {
  const booking = await bookingService.approveBooking(req.params.id, req.user.id);
  res.json({ booking });
}

export async function reject(req, res) {
  const booking = await bookingService.rejectBooking(
    req.params.id,
    req.user.id,
    req.body?.reason
  );
  res.json({ booking });
}

export async function issue(req, res) {
  const booking = await bookingService.issueBooking(req.params.id, req.user.id, req.body);
  res.json({ booking });
}

export async function returnAsset(req, res) {
  const booking = await bookingService.returnBooking(req.params.id, req.user.id, req.body);
  res.json({ booking });
}
